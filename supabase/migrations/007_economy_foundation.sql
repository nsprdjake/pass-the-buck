-- Phase 1 of the sticky economy:
--   - Theme catalog + ownership ledger + active theme on profiles
--   - Per-user stats table (denormalized for leaderboards)
--   - Daily bonus ledger
--   - RPCs: claim_daily_login, buy_theme
--   - Settlement function now also updates stats and applies streak +
--     first-win-of-day bonuses, transactionally
--   - New-user trigger also creates an empty stats row

-- ─── Themes catalog ────────────────────────────────────────────────
create table if not exists ptb_themes (
  slug text primary key,
  name text not null,
  tagline text,
  price_eyebucks int not null default 0 check (price_eyebucks >= 0),
  sort_order int not null default 0,
  is_default boolean not null default false
);

alter table ptb_themes enable row level security;
drop policy if exists "ptb_themes_select_all" on ptb_themes;
create policy "ptb_themes_select_all" on ptb_themes for select using (true);

insert into ptb_themes (slug, name, tagline, price_eyebucks, sort_order, is_default)
values
  ('saloon', 'Saloon', 'Frontier scrip, bone dice, deep-felt poker table', 0, 0, true),
  ('speakeasy', 'Speakeasy', 'Prohibition Art Deco — emerald and gold', 500, 1, false),
  ('cantina', 'Cantina', 'Sunset Mexican Western — orange and turquoise', 1000, 2, false),
  ('old-money', 'Old Money', 'Gilded Age serif — navy and maroon', 2000, 3, false),
  ('riverboat', 'Riverboat', 'Mississippi gambler — slate and polished brass', 3500, 4, false)
on conflict (slug) do nothing;

-- ─── Owned-themes ledger ───────────────────────────────────────────
create table if not exists ptb_owned_themes (
  user_id uuid not null references auth.users(id) on delete cascade,
  theme_slug text not null references ptb_themes(slug),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, theme_slug)
);

create index if not exists idx_ptb_owned_themes_user on ptb_owned_themes(user_id);

alter table ptb_owned_themes enable row level security;
drop policy if exists "ptb_owned_themes_select_own" on ptb_owned_themes;
create policy "ptb_owned_themes_select_own" on ptb_owned_themes
  for select using (auth.uid() = user_id);
-- Insertions go through the buy_theme RPC; clients can't directly insert.

-- ─── Active theme on profile ───────────────────────────────────────
alter table ptb_profiles
  add column if not exists active_theme_slug text not null default 'saloon'
  references ptb_themes(slug);

-- ─── Stats (denormalized for fast leaderboards) ────────────────────
create table if not exists ptb_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  games_played int not null default 0,
  games_won int not null default 0,
  games_lost_with_tab int not null default 0,
  total_earned_eyebucks int not null default 0,
  biggest_pot int not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_played_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_ptb_stats_balance_lookups on ptb_stats(user_id);
create index if not exists idx_ptb_stats_biggest_pot on ptb_stats(biggest_pot desc);
create index if not exists idx_ptb_stats_streak on ptb_stats(longest_streak desc);
create index if not exists idx_ptb_stats_games on ptb_stats(games_played desc);

alter table ptb_stats enable row level security;
drop policy if exists "ptb_stats_select_all" on ptb_stats;
create policy "ptb_stats_select_all" on ptb_stats for select using (true);
-- No client writes. All updates flow through settle_game + RPCs.

-- ─── Daily bonus ledger ────────────────────────────────────────────
create table if not exists ptb_daily_bonuses (
  user_id uuid not null references auth.users(id) on delete cascade,
  bonus_date date not null,
  bonus_type text not null,  -- 'login' | 'first_win'
  amount int not null,
  awarded_at timestamptz not null default now(),
  primary key (user_id, bonus_date, bonus_type)
);

alter table ptb_daily_bonuses enable row level security;
drop policy if exists "ptb_daily_bonuses_select_own" on ptb_daily_bonuses;
create policy "ptb_daily_bonuses_select_own" on ptb_daily_bonuses
  for select using (auth.uid() = user_id);

-- ─── Trigger: auto-init stats row for new users ────────────────────
create or replace function ptb_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ptb_profiles (id)
    values (new.id) on conflict (id) do nothing;
  insert into public.ptb_stats (user_id)
    values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists ptb_on_auth_user_created on auth.users;
create trigger ptb_on_auth_user_created
  after insert on auth.users
  for each row execute function ptb_handle_new_user();

-- Backfill stats rows for users who already exist
insert into ptb_stats (user_id)
select id from auth.users on conflict (user_id) do nothing;

-- ─── RPC: claim daily login bonus (idempotent per day) ─────────────
create or replace function ptb_claim_daily_login()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_amount int := 10;
begin
  if v_user_id is null then return 0; end if;
  insert into ptb_daily_bonuses (user_id, bonus_date, bonus_type, amount)
    values (v_user_id, current_date, 'login', v_amount);
  -- If we got here, the insert succeeded (no row for today). Credit the balance.
  update ptb_profiles
    set balance = balance + v_amount, updated_at = now()
    where id = v_user_id;
  update ptb_stats
    set total_earned_eyebucks = total_earned_eyebucks + v_amount,
        updated_at = now()
    where user_id = v_user_id;
  return v_amount;
exception
  when unique_violation then
    -- Already claimed today. No-op.
    return 0;
end;
$$;
grant execute on function ptb_claim_daily_login() to authenticated;

-- ─── RPC: buy a theme ──────────────────────────────────────────────
create or replace function ptb_buy_theme(p_slug text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_price int;
  v_balance int;
  v_already_owned boolean;
begin
  if v_user_id is null then raise exception 'Not signed in'; end if;

  select price_eyebucks into v_price from ptb_themes where slug = p_slug;
  if not found then raise exception 'Unknown theme'; end if;

  select exists (
    select 1 from ptb_owned_themes
    where user_id = v_user_id and theme_slug = p_slug
  ) into v_already_owned;
  if v_already_owned then return true; end if;

  if v_price = 0 then
    insert into ptb_owned_themes (user_id, theme_slug)
      values (v_user_id, p_slug) on conflict do nothing;
    return true;
  end if;

  -- Lock the profile row, deduct, insert ownership atomically
  select balance into v_balance from ptb_profiles where id = v_user_id for update;
  if v_balance < v_price then
    raise exception 'Not enough eyeBucks (need %, have %)', v_price, v_balance;
  end if;
  update ptb_profiles
    set balance = balance - v_price, updated_at = now()
    where id = v_user_id;
  insert into ptb_owned_themes (user_id, theme_slug)
    values (v_user_id, p_slug) on conflict do nothing;
  return true;
end;
$$;
grant execute on function ptb_buy_theme(text) to authenticated;

-- ─── Settlement: also updates stats + streak + first-win bonus ─────
create or replace function ptb_settle_game(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game ptb_games%rowtype;
  v_player_count int;
  v_reward int;
  v_winner_user_id uuid;
  v_new_streak int;
  v_streak_bonus int;
  v_first_win_bonus int := 25;
begin
  select * into v_game from ptb_games where id = p_game_id for update;
  if not found then raise exception 'Game % not found', p_game_id; end if;
  if v_game.status <> 'finished' then return; end if;
  if v_game.settled_at is not null then return; end if;
  if v_game.winner_player_id is null then
    update ptb_games set settled_at = now() where id = p_game_id;
    return;
  end if;

  select count(*) into v_player_count from ptb_players where game_id = p_game_id;

  -- Identify the user (if any) at the "finalist" seat (last with bucks).
  select user_id into v_winner_user_id
    from ptb_players
    where id = v_game.winner_player_id and user_id is not null;

  if v_game.mode = 'winner' then
    -- Champion: credit pot reward, bump stats, apply streak + first-win bonuses
    v_reward := v_player_count * v_game.buy_in;
    if v_winner_user_id is not null then
      update ptb_profiles
        set balance = balance + v_reward, updated_at = now()
        where id = v_winner_user_id;

      insert into ptb_stats (user_id) values (v_winner_user_id)
        on conflict (user_id) do nothing;

      select current_streak + 1 into v_new_streak
        from ptb_stats where user_id = v_winner_user_id;

      update ptb_stats set
        games_played = games_played + 1,
        games_won = games_won + 1,
        total_earned_eyebucks = total_earned_eyebucks + v_reward,
        biggest_pot = greatest(biggest_pot, v_reward),
        current_streak = v_new_streak,
        longest_streak = greatest(longest_streak, v_new_streak),
        last_played_at = now(),
        updated_at = now()
        where user_id = v_winner_user_id;

      -- Streak bonus: +5 per consecutive win after the first, capped at +50
      if v_new_streak >= 2 then
        v_streak_bonus := least((v_new_streak - 1) * 5, 50);
        update ptb_profiles
          set balance = balance + v_streak_bonus, updated_at = now()
          where id = v_winner_user_id;
        update ptb_stats
          set total_earned_eyebucks = total_earned_eyebucks + v_streak_bonus
          where user_id = v_winner_user_id;
      end if;

      -- First-win-of-the-day bonus (idempotent per day)
      begin
        insert into ptb_daily_bonuses (user_id, bonus_date, bonus_type, amount)
          values (v_winner_user_id, current_date, 'first_win', v_first_win_bonus);
        update ptb_profiles
          set balance = balance + v_first_win_bonus, updated_at = now()
          where id = v_winner_user_id;
        update ptb_stats
          set total_earned_eyebucks = total_earned_eyebucks + v_first_win_bonus
          where user_id = v_winner_user_id;
      exception when unique_violation then
        -- Already claimed today. No-op.
      end;
    end if;

    -- Losers: stats + streak reset
    update ptb_stats set
      games_played = games_played + 1,
      current_streak = 0,
      last_played_at = now(),
      updated_at = now()
      where user_id in (
        select user_id from ptb_players
          where game_id = p_game_id
            and id <> v_game.winner_player_id
            and user_id is not null
      );

  else
    -- Loser mode: every non-loser is rewarded buy_in
    update ptb_profiles
      set balance = balance + v_game.buy_in, updated_at = now()
      where id in (
        select user_id from ptb_players
          where game_id = p_game_id
            and id <> v_game.winner_player_id
            and user_id is not null
      );

    update ptb_stats set
      games_played = games_played + 1,
      total_earned_eyebucks = total_earned_eyebucks + v_game.buy_in,
      current_streak = current_streak + 1,
      longest_streak = greatest(longest_streak, current_streak + 1),
      last_played_at = now(),
      updated_at = now()
      where user_id in (
        select user_id from ptb_players
          where game_id = p_game_id
            and id <> v_game.winner_player_id
            and user_id is not null
      );

    -- Tab-picker: counted as "lost with the tab"; streak resets
    if v_winner_user_id is not null then
      insert into ptb_stats (user_id) values (v_winner_user_id)
        on conflict (user_id) do nothing;
      update ptb_stats set
        games_played = games_played + 1,
        games_lost_with_tab = games_lost_with_tab + 1,
        current_streak = 0,
        last_played_at = now(),
        updated_at = now()
        where user_id = v_winner_user_id;
    end if;
  end if;

  update ptb_games set settled_at = now() where id = p_game_id;
end;
$$;
