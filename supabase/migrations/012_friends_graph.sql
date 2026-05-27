-- Phase 4b — Friends graph + Friends leaderboard
--
-- "Friends" are formed automatically when two signed-in users finish a
-- multi-device game together. No invite flow, no friend requests, no
-- profile-search. This keeps friction at zero and matches how people
-- actually use this game (you play with your friends; they're now
-- "friends" in the leaderboard sense).
--
-- The pairs table is undirected — we store (least(a,b), greatest(a,b))
-- so each pair lives in exactly one row. This makes idempotent inserts
-- trivial and avoids the doubled-row foot-gun.

create table if not exists ptb_friends (
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  source text not null default 'shared_game'
    check (source in ('shared_game', 'manual')),
  first_played_at timestamptz not null default now(),
  shared_game_count int not null default 1 check (shared_game_count >= 1),
  /** Either user can hide the friend from their leaderboard view. */
  hidden_by_a boolean not null default false,
  hidden_by_b boolean not null default false,
  primary key (user_a, user_b),
  check (user_a < user_b)
);

create index if not exists idx_ptb_friends_a on ptb_friends(user_a);
create index if not exists idx_ptb_friends_b on ptb_friends(user_b);

alter table ptb_friends enable row level security;

-- Either party can see and update the row.
drop policy if exists "ptb_friends_select_party" on ptb_friends;
create policy "ptb_friends_select_party" on ptb_friends
  for select using (auth.uid() = user_a or auth.uid() = user_b);
drop policy if exists "ptb_friends_update_party" on ptb_friends;
create policy "ptb_friends_update_party" on ptb_friends
  for update using (auth.uid() = user_a or auth.uid() = user_b);

-- ─── Helper: upsert all friend pairs for a finished game ──────────
create or replace function ptb_record_game_friendships(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_ids uuid[];
  v_i int;
  v_j int;
  v_a uuid;
  v_b uuid;
begin
  -- Distinct signed-in user IDs in this game.
  select array_agg(distinct user_id)
    into v_user_ids
    from ptb_players
    where game_id = p_game_id and user_id is not null;

  if v_user_ids is null or array_length(v_user_ids, 1) < 2 then
    return;
  end if;

  -- Pairwise upsert.
  for v_i in 1 .. array_length(v_user_ids, 1) - 1 loop
    for v_j in v_i + 1 .. array_length(v_user_ids, 1) loop
      if v_user_ids[v_i] < v_user_ids[v_j] then
        v_a := v_user_ids[v_i];
        v_b := v_user_ids[v_j];
      else
        v_a := v_user_ids[v_j];
        v_b := v_user_ids[v_i];
      end if;

      insert into ptb_friends (user_a, user_b, source, shared_game_count)
        values (v_a, v_b, 'shared_game', 1)
      on conflict (user_a, user_b) do update set
        shared_game_count = ptb_friends.shared_game_count + 1;
    end loop;
  end loop;
end;
$$;
grant execute on function ptb_record_game_friendships(uuid) to authenticated;

-- ─── Wire it into settle_game so finished games auto-record ───────
-- We patch ptb_settle_game by tacking the call onto the end. Done as a
-- "before-end" supplement so we don't replicate the whole function body.
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
    perform ptb_record_game_friendships(p_game_id);
    return;
  end if;

  select count(*) into v_player_count from ptb_players where game_id = p_game_id;

  select user_id into v_winner_user_id
    from ptb_players
    where id = v_game.winner_player_id and user_id is not null;

  if v_game.mode = 'winner' then
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

      if v_new_streak >= 2 then
        v_streak_bonus := least((v_new_streak - 1) * 5, 50);
        update ptb_profiles
          set balance = balance + v_streak_bonus, updated_at = now()
          where id = v_winner_user_id;
        update ptb_stats
          set total_earned_eyebucks = total_earned_eyebucks + v_streak_bonus
          where user_id = v_winner_user_id;
      end if;

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
        -- Already claimed today.
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
    -- Loser mode
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

  -- NEW: record friendship pairs for every player who was signed in.
  perform ptb_record_game_friendships(p_game_id);
end;
$$;

-- ─── Backfill: derive friendships from existing finished games ─────
do $$
declare
  g record;
begin
  for g in
    select id from ptb_games where status = 'finished' and settled_at is not null
  loop
    perform ptb_record_game_friendships(g.id);
  end loop;
end$$;
