-- Phase 2.5 — Power-ups
--
-- Consumable items the user equips for a single game. Bought from /profile,
-- equipped from /profile, applied (and consumed) automatically when the
-- next game settles. No mid-game UI needed for v1 — all post-game math.

create table if not exists ptb_powerups (
  slug text primary key,
  name text not null,
  description text not null,
  icon text not null default '✨',
  price_eyebucks int not null default 0,
  /* The effect kind drives settlement logic in ptb_settle_game. */
  effect_type text not null check (effect_type in (
    'win_multiplier_1_5x',  -- multiplies winner-mode reward by 1.5x
    'win_flat_bonus_25',    -- adds +25 to winner-mode reward
    'consolation_25'        -- if you don't win, refund 25 eyeBucks
  )),
  sort_order int not null default 0
);

alter table ptb_powerups enable row level security;
drop policy if exists "ptb_powerups_select_all" on ptb_powerups;
create policy "ptb_powerups_select_all" on ptb_powerups for select using (true);

insert into ptb_powerups (slug, name, description, icon, price_eyebucks, effect_type, sort_order) values
  ('hot-hand',
   'Hot Hand',
   'Your next winner-mode win pays out 1.5×.',
   '🔥', 100, 'win_multiplier_1_5x', 1),
  ('lucky-token',
   'Lucky Token',
   'Your next win earns a flat +25 eyeBucks on top.',
   '🍀', 50, 'win_flat_bonus_25', 2),
  ('comeback-coin',
   'Comeback Coin',
   'Lose your next game and get 25 eyeBucks back.',
   '🪙', 100, 'consolation_25', 3)
on conflict (slug) do nothing;

create table if not exists ptb_user_powerups (
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null references ptb_powerups(slug),
  quantity int not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, slug)
);

create index if not exists idx_ptb_user_powerups_user on ptb_user_powerups(user_id);
alter table ptb_user_powerups enable row level security;
drop policy if exists "ptb_user_powerups_select_own" on ptb_user_powerups;
create policy "ptb_user_powerups_select_own" on ptb_user_powerups
  for select using (auth.uid() = user_id);
-- All writes go through RPCs.

-- Which power-up (if any) is equipped for the user's next game.
alter table ptb_profiles
  add column if not exists active_powerup_slug text
  references ptb_powerups(slug) on delete set null;

-- ─── Buy: increments inventory, deducts balance ────────────────────
create or replace function ptb_buy_powerup(p_slug text, p_qty int default 1)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_price int;
  v_total int;
  v_balance int;
begin
  if v_user_id is null then raise exception 'Not signed in'; end if;
  if p_qty < 1 or p_qty > 50 then raise exception 'Invalid quantity'; end if;
  select price_eyebucks into v_price from ptb_powerups where slug = p_slug;
  if not found then raise exception 'Unknown power-up'; end if;
  v_total := v_price * p_qty;
  select balance into v_balance from ptb_profiles where id = v_user_id for update;
  if v_balance < v_total then
    raise exception 'Not enough eyeBucks (need %, have %)', v_total, v_balance;
  end if;
  update ptb_profiles set balance = balance - v_total, updated_at = now()
    where id = v_user_id;
  insert into ptb_user_powerups (user_id, slug, quantity)
    values (v_user_id, p_slug, p_qty)
    on conflict (user_id, slug) do update
      set quantity = ptb_user_powerups.quantity + excluded.quantity,
          updated_at = now();
  return true;
end;
$$;
grant execute on function ptb_buy_powerup(text, int) to authenticated;

-- ─── Equip: marks one as active for the next game ──────────────────
-- Equipping is FREE (no inventory deducted yet). Consumption happens
-- on game settle. Equipping while one is already active replaces it.
-- Passing NULL un-equips.
create or replace function ptb_equip_powerup(p_slug text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_qty int;
begin
  if v_user_id is null then raise exception 'Not signed in'; end if;
  if p_slug is null then
    update ptb_profiles set active_powerup_slug = null, updated_at = now()
      where id = v_user_id;
    return true;
  end if;
  -- Confirm slug exists
  perform 1 from ptb_powerups where slug = p_slug;
  if not found then raise exception 'Unknown power-up'; end if;
  -- Confirm user owns at least 1
  select quantity into v_qty from ptb_user_powerups
    where user_id = v_user_id and slug = p_slug;
  if v_qty is null or v_qty < 1 then
    raise exception 'You do not own this power-up.';
  end if;
  update ptb_profiles set active_powerup_slug = p_slug, updated_at = now()
    where id = v_user_id;
  return true;
end;
$$;
grant execute on function ptb_equip_powerup(text) to authenticated;

-- ─── Settlement: apply + consume any active power-ups ──────────────
-- Reads each signed-in participant's active power-up at game start (well,
-- at settle time — we don't snapshot earlier, which is fine for v1: equip
-- before joining the game) and applies the matching effect, then consumes
-- one charge and clears the active slot.
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
  v_active_powerup text;
  v_bonus int;
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
  select user_id into v_winner_user_id from ptb_players
    where id = v_game.winner_player_id and user_id is not null;

  if v_game.mode = 'winner' then
    v_reward := v_player_count * v_game.buy_in;
    if v_winner_user_id is not null then
      -- Apply winner-side power-ups before crediting the pot
      select active_powerup_slug into v_active_powerup
        from ptb_profiles where id = v_winner_user_id;
      v_bonus := 0;
      if v_active_powerup = 'win_multiplier_1_5x' or v_active_powerup = 'hot-hand' then
        v_bonus := v_reward / 2;  -- 1.5× means +50% bonus
      elsif v_active_powerup = 'lucky-token' then
        v_bonus := 25;
      end if;

      update ptb_profiles set balance = balance + v_reward + v_bonus, updated_at = now()
        where id = v_winner_user_id;
      insert into ptb_stats (user_id) values (v_winner_user_id) on conflict (user_id) do nothing;
      select current_streak + 1 into v_new_streak from ptb_stats where user_id = v_winner_user_id;
      update ptb_stats set
        games_played = games_played + 1,
        games_won = games_won + 1,
        total_earned_eyebucks = total_earned_eyebucks + v_reward + v_bonus,
        biggest_pot = greatest(biggest_pot, v_reward + v_bonus),
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

      -- Consume the power-up if it triggered (or even if it didn't but was equipped — equip
      -- semantically means "for my NEXT game", so it's spent regardless of outcome).
      if v_active_powerup is not null then
        update ptb_user_powerups
          set quantity = greatest(0, quantity - 1), updated_at = now()
          where user_id = v_winner_user_id and slug = v_active_powerup;
        update ptb_profiles set active_powerup_slug = null, updated_at = now()
          where id = v_winner_user_id;
      end if;
    end if;

    -- Losers: stats + streak reset + consolation power-up handling
    for v_participant_user_id in
      select user_id from ptb_players
        where game_id = p_game_id
          and id <> v_game.winner_player_id
          and user_id is not null
    loop
      update ptb_stats set
        games_played = games_played + 1,
        current_streak = 0,
        last_played_at = now(),
        updated_at = now()
        where user_id = v_participant_user_id;

      -- Apply consolation power-up if equipped
      select active_powerup_slug into v_active_powerup
        from ptb_profiles where id = v_participant_user_id;
      if v_active_powerup = 'consolation_25' or v_active_powerup = 'comeback-coin' then
        update ptb_profiles set balance = balance + 25, updated_at = now()
          where id = v_participant_user_id;
        update ptb_stats set total_earned_eyebucks = total_earned_eyebucks + 25
          where user_id = v_participant_user_id;
      end if;
      if v_active_powerup is not null then
        update ptb_user_powerups
          set quantity = greatest(0, quantity - 1), updated_at = now()
          where user_id = v_participant_user_id and slug = v_active_powerup;
        update ptb_profiles set active_powerup_slug = null, updated_at = now()
          where id = v_participant_user_id;
      end if;
    end loop;
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

    -- In loser mode, ALL participants consume their power-ups. The
    -- tab-picker can also benefit from consolation-25 since they "lost"
    -- the spirit of the game even though they're holding the last buck.
    for v_participant_user_id in
      select distinct user_id from ptb_players
        where game_id = p_game_id and user_id is not null
    loop
      select active_powerup_slug into v_active_powerup
        from ptb_profiles where id = v_participant_user_id;
      if v_participant_user_id = v_winner_user_id
         and (v_active_powerup = 'consolation_25' or v_active_powerup = 'comeback-coin') then
        update ptb_profiles set balance = balance + 25, updated_at = now()
          where id = v_participant_user_id;
        update ptb_stats set total_earned_eyebucks = total_earned_eyebucks + 25
          where user_id = v_participant_user_id;
      end if;
      if v_active_powerup is not null then
        update ptb_user_powerups
          set quantity = greatest(0, quantity - 1), updated_at = now()
          where user_id = v_participant_user_id and slug = v_active_powerup;
        update ptb_profiles set active_powerup_slug = null, updated_at = now()
          where id = v_participant_user_id;
      end if;
    end loop;
  end if;

  for v_participant_user_id in
    select distinct user_id from ptb_players where game_id = p_game_id and user_id is not null
  loop
    perform ptb_evaluate_achievements(v_participant_user_id);
  end loop;

  update ptb_games set settled_at = now() where id = p_game_id;
end;
$$;
