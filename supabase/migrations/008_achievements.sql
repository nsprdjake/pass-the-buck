-- Phase 2 — Achievements (a.k.a. "badges")
--
-- A small catalog of milestone-based achievements that get awarded
-- automatically when a user's stats / balance / collection crosses a
-- threshold. Each awards a small eyeBuck bonus on first earn.
--
-- Evaluation is centralized in ptb_evaluate_achievements(uuid) and called
-- from anywhere a stat changes (settle_game, claim_daily_login, buy_theme).

create table if not exists ptb_achievements (
  slug text primary key,
  name text not null,
  description text not null,
  icon text not null default '★',
  reward_eyebucks int not null default 25,
  sort_order int not null default 0,
  hidden boolean not null default false  -- shown only after earning
);

alter table ptb_achievements enable row level security;
drop policy if exists "ptb_achievements_select_all" on ptb_achievements;
create policy "ptb_achievements_select_all" on ptb_achievements for select using (true);

create table if not exists ptb_user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null references ptb_achievements(slug),
  awarded_at timestamptz not null default now(),
  seen boolean not null default false,
  primary key (user_id, slug)
);

create index if not exists idx_ptb_user_ach_unseen
  on ptb_user_achievements(user_id) where seen = false;

alter table ptb_user_achievements enable row level security;
drop policy if exists "ptb_user_ach_select_own" on ptb_user_achievements;
drop policy if exists "ptb_user_ach_update_own_seen" on ptb_user_achievements;
create policy "ptb_user_ach_select_own" on ptb_user_achievements
  for select using (auth.uid() = user_id);
create policy "ptb_user_ach_update_own_seen" on ptb_user_achievements
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed catalog. Ordered by rough difficulty within each lane.
insert into ptb_achievements (slug, name, description, icon, reward_eyebucks, sort_order, hidden) values
  -- Volume
  ('first-hand',         'First Hand',         'Play your first cross-device game.',           '🤠',  25,   1, false),
  ('saddle-sore',        'Saddle Sore',        'Play 10 cross-device games.',                   '🐎',  50,   2, false),
  ('bunkhouse-regular',  'Bunkhouse Regular',  'Play 100 cross-device games.',                  '🛏️',  150,  3, false),
  ('old-hand',           'Old Hand',           'Play 500 cross-device games.',                  '👴',  500,  4, false),
  -- Wins
  ('first-pot',          'First Pot',          'Win your first cross-device hand.',             '🏆',  50,  10, false),
  ('ten-gallon-hat',     'Ten-Gallon Hat',     'Win 10 hands.',                                 '🎩',  100, 11, false),
  ('house-always-wins',  'House Always Wins',  'Win 100 hands.',                                '🏛️',  500, 12, false),
  -- Streaks
  ('lucky-streak',       'Lucky Streak',       'Win 3 hands in a row.',                          '🍀',  50,  20, false),
  ('sharp-shooter',      'Sharp-Shooter',      'Win 5 hands in a row.',                          '🎯',  100, 21, false),
  ('clean-sweep',        'Clean Sweep',        'Win 10 hands in a row.',                         '🧹',  250, 22, false),
  -- Tab-pickers (loser mode "wins")
  ('first-tab',          'First Tab',          'Get stuck with the tab once.',                  '💸',  25,  30, false),
  ('tab-king',           'Tab King',           'Get stuck with the tab 25 times.',              '👑',  100, 31, false),
  ('tab-royalty',        'Tab Royalty',        'Get stuck with the tab 50 times.',              '💎',  250, 32, false),
  -- Biggest pot
  ('first-pot-pulled',   'Pot Pulled',         'Pull your first pot.',                          '💰',  25,  40, false),
  ('high-roller',        'High Roller',        'Pull a pot of 50 eyeBucks or more.',            '🎲',  75,  41, false),
  ('whale',              'Whale',              'Pull a pot of 200 eyeBucks or more.',           '🐳',  200, 42, false),
  -- Wallet milestones
  ('fortune',            'A Modest Fortune',   'Hold 1,000 eyeBucks at once.',                  '💵',  75,  50, false),
  ('deep-pockets',       'Deep Pockets',       'Hold 5,000 eyeBucks at once.',                  '🪙',  250, 51, false),
  -- Collection
  ('the-whole-saloon',   'The Whole Saloon',   'Own every theme in the catalog.',               '🏚️',  500, 60, false),
  ('hometown-hero',      'Hometown Hero',      'Play 25 local pass-and-play hands.',            '🤝',  100, 70, false)
on conflict (slug) do nothing;

-- Centralized evaluator. Returns the slugs of newly-awarded achievements.
create or replace function ptb_evaluate_achievements(p_user_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stats ptb_stats%rowtype;
  v_balance int;
  v_theme_count int;
  v_newly text[] := array[]::text[];
  v_slug text;
  v_reward int;
begin
  if p_user_id is null then return v_newly; end if;

  select * into v_stats from ptb_stats where user_id = p_user_id;
  if not found then return v_newly; end if;
  select balance into v_balance from ptb_profiles where id = p_user_id;
  select count(*) into v_theme_count from ptb_owned_themes where user_id = p_user_id;

  -- Helper: evaluate one achievement. If `met` and not already earned,
  -- insert + bump balance + push slug into the return list.
  -- (Inlined as a series of IF blocks because PL/pgSQL doesn't have
  -- closures and the bookkeeping is uniform enough.)

  for v_slug, v_reward in
    select a.slug, a.reward_eyebucks
    from ptb_achievements a
    left join ptb_user_achievements ua
      on ua.slug = a.slug and ua.user_id = p_user_id
    where ua.user_id is null
  loop
    -- Per-slug threshold check. New achievements get added here.
    if (
      (v_slug = 'first-hand'        and v_stats.games_played >= 1)
      or (v_slug = 'saddle-sore'    and v_stats.games_played >= 10)
      or (v_slug = 'bunkhouse-regular' and v_stats.games_played >= 100)
      or (v_slug = 'old-hand'       and v_stats.games_played >= 500)
      or (v_slug = 'first-pot'      and v_stats.games_won >= 1)
      or (v_slug = 'ten-gallon-hat' and v_stats.games_won >= 10)
      or (v_slug = 'house-always-wins' and v_stats.games_won >= 100)
      or (v_slug = 'lucky-streak'   and v_stats.longest_streak >= 3)
      or (v_slug = 'sharp-shooter'  and v_stats.longest_streak >= 5)
      or (v_slug = 'clean-sweep'    and v_stats.longest_streak >= 10)
      or (v_slug = 'first-tab'      and v_stats.games_lost_with_tab >= 1)
      or (v_slug = 'tab-king'       and v_stats.games_lost_with_tab >= 25)
      or (v_slug = 'tab-royalty'    and v_stats.games_lost_with_tab >= 50)
      or (v_slug = 'first-pot-pulled' and v_stats.biggest_pot >= 1)
      or (v_slug = 'high-roller'    and v_stats.biggest_pot >= 50)
      or (v_slug = 'whale'          and v_stats.biggest_pot >= 200)
      or (v_slug = 'fortune'        and v_balance >= 1000)
      or (v_slug = 'deep-pockets'   and v_balance >= 5000)
      or (v_slug = 'the-whole-saloon' and v_theme_count >= 5)
      -- hometown-hero is awarded via the local-game tally column, populated
      -- by the ptb_record_local_game RPC (see below). The check still lives
      -- here for uniformity.
      or (v_slug = 'hometown-hero'  and coalesce(
          (select count(*) from ptb_daily_bonuses
           where user_id = p_user_id and bonus_type like 'local_game:%'), 0) >= 25)
    ) then
      insert into ptb_user_achievements (user_id, slug)
        values (p_user_id, v_slug)
        on conflict do nothing;
      update ptb_profiles
        set balance = balance + v_reward, updated_at = now()
        where id = p_user_id;
      update ptb_stats
        set total_earned_eyebucks = total_earned_eyebucks + v_reward
        where user_id = p_user_id;
      v_newly := array_append(v_newly, v_slug);
    end if;
  end loop;

  return v_newly;
end;
$$;

grant execute on function ptb_evaluate_achievements(uuid) to authenticated, anon;

-- Hook achievement evaluation into the settlement function. We need to
-- call it for every player who participated and has a user_id.
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
  v_participant_user_id uuid;
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

  select user_id into v_winner_user_id
    from ptb_players
    where id = v_game.winner_player_id and user_id is not null;

  if v_game.mode = 'winner' then
    v_reward := v_player_count * v_game.buy_in;
    if v_winner_user_id is not null then
      update ptb_profiles set balance = balance + v_reward, updated_at = now()
        where id = v_winner_user_id;
      insert into ptb_stats (user_id) values (v_winner_user_id) on conflict (user_id) do nothing;
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
      if v_new_streak >= 2 then
        v_streak_bonus := least((v_new_streak - 1) * 5, 50);
        update ptb_profiles set balance = balance + v_streak_bonus, updated_at = now()
          where id = v_winner_user_id;
        update ptb_stats set total_earned_eyebucks = total_earned_eyebucks + v_streak_bonus
          where user_id = v_winner_user_id;
      end if;
      begin
        insert into ptb_daily_bonuses (user_id, bonus_date, bonus_type, amount)
          values (v_winner_user_id, current_date, 'first_win', v_first_win_bonus);
        update ptb_profiles set balance = balance + v_first_win_bonus, updated_at = now()
          where id = v_winner_user_id;
        update ptb_stats set total_earned_eyebucks = total_earned_eyebucks + v_first_win_bonus
          where user_id = v_winner_user_id;
      exception when unique_violation then
      end;
    end if;
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
    if v_winner_user_id is not null then
      insert into ptb_stats (user_id) values (v_winner_user_id) on conflict (user_id) do nothing;
      update ptb_stats set
        games_played = games_played + 1,
        games_lost_with_tab = games_lost_with_tab + 1,
        current_streak = 0,
        last_played_at = now(),
        updated_at = now()
        where user_id = v_winner_user_id;
    end if;
  end if;

  -- Run achievement evaluation for every signed-in participant.
  for v_participant_user_id in
    select distinct user_id from ptb_players
      where game_id = p_game_id and user_id is not null
  loop
    perform ptb_evaluate_achievements(v_participant_user_id);
  end loop;

  update ptb_games set settled_at = now() where id = p_game_id;
end;
$$;

-- Also re-evaluate after balance-affecting non-game events: daily login,
-- theme purchase. Cheap; no-ops when no thresholds cross.
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
  update ptb_profiles set balance = balance + v_amount, updated_at = now()
    where id = v_user_id;
  update ptb_stats set total_earned_eyebucks = total_earned_eyebucks + v_amount,
    updated_at = now()
    where user_id = v_user_id;
  perform ptb_evaluate_achievements(v_user_id);
  return v_amount;
exception
  when unique_violation then
    return 0;
end;
$$;
grant execute on function ptb_claim_daily_login() to authenticated;

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
    insert into ptb_owned_themes (user_id, theme_slug) values (v_user_id, p_slug)
      on conflict do nothing;
    perform ptb_evaluate_achievements(v_user_id);
    return true;
  end if;
  select balance into v_balance from ptb_profiles where id = v_user_id for update;
  if v_balance < v_price then
    raise exception 'Not enough eyeBucks (need %, have %)', v_price, v_balance;
  end if;
  update ptb_profiles set balance = balance - v_price, updated_at = now()
    where id = v_user_id;
  insert into ptb_owned_themes (user_id, theme_slug) values (v_user_id, p_slug)
    on conflict do nothing;
  perform ptb_evaluate_achievements(v_user_id);
  return true;
end;
$$;
grant execute on function ptb_buy_theme(text) to authenticated;

-- Record a finished local pass-and-play game when the host is signed in.
-- Credits 5 eyeBucks, bumps games_played, and counts toward Hometown Hero.
-- Idempotent per local-game ID so re-renders / refreshes don't double-pay.
create or replace function ptb_record_local_game(p_local_id text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_amount int := 5;
begin
  if v_user_id is null then return 0; end if;
  if p_local_id is null or length(p_local_id) = 0 then return 0; end if;
  -- Re-use the daily_bonuses table as a generic event ledger keyed on the
  -- local game id. (bonus_date doubles as "first 64 chars of local id"
  -- isn't ideal — use current_date but make bonus_type carry the unique id.)
  begin
    insert into ptb_daily_bonuses (user_id, bonus_date, bonus_type, amount)
      values (v_user_id, current_date, 'local_game:' || p_local_id, v_amount);
  exception when unique_violation then
    return 0;
  end;
  update ptb_profiles set balance = balance + v_amount, updated_at = now()
    where id = v_user_id;
  insert into ptb_stats (user_id) values (v_user_id) on conflict (user_id) do nothing;
  update ptb_stats set
    games_played = games_played + 1,
    total_earned_eyebucks = total_earned_eyebucks + v_amount,
    last_played_at = now(),
    updated_at = now()
    where user_id = v_user_id;
  perform ptb_evaluate_achievements(v_user_id);
  return v_amount;
end;
$$;
grant execute on function ptb_record_local_game(text) to authenticated;
