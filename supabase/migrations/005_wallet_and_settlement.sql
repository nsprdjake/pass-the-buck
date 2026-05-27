-- Wallet + game-end settlement.
--
-- Every profile gets a balance (default 100 starter eyeBucks). Multi-device
-- games credit eyeBucks to signed-in players when they finish, via the
-- ptb_settle_game RPC. Idempotent — runs once per game even if multiple
-- devices call it on game-end.

alter table ptb_profiles
  add column if not exists balance int not null default 100;

-- Allow zero but not negative. We'll deduct against this later when entry
-- costs / power-ups land.
alter table ptb_profiles
  add constraint ptb_profiles_balance_check check (balance >= 0);

-- Backfill anyone who somehow has 0 to the starter balance. Cheap belt-and-
-- suspenders for any rows that pre-existed before the default landed.
update ptb_profiles set balance = 100 where balance = 0;

-- Idempotency flag on games. Settle once and only once.
alter table ptb_games
  add column if not exists settled_at timestamptz;

-- Rewards function (security definer so it can write to ptb_profiles
-- regardless of who calls it — RLS otherwise gates writes on auth.uid()).
--
-- Rules:
--   * winner mode: champion (game.winner_player_id) gets num_players * buy_in.
--   * loser mode:  every non-loser (everyone who isn't the survivor) gets
--                  buy_in as a survival bonus.
-- Anonymous players (no user_id) are skipped — they have no profile to credit.
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
begin
  -- Lock the row so concurrent callers don't double-settle.
  select * into v_game from ptb_games where id = p_game_id for update;
  if not found then
    raise exception 'Game % not found', p_game_id;
  end if;
  if v_game.status <> 'finished' then
    -- Not done yet — silent no-op so clients can call safely on any state.
    return;
  end if;
  if v_game.settled_at is not null then
    -- Already paid out.
    return;
  end if;
  if v_game.winner_player_id is null then
    -- Defensive: no finalist recorded, nothing to settle on.
    update ptb_games set settled_at = now() where id = p_game_id;
    return;
  end if;

  select count(*) into v_player_count from ptb_players where game_id = p_game_id;

  if v_game.mode = 'winner' then
    -- Champion takes the whole pot.
    v_reward := v_player_count * v_game.buy_in;
    update ptb_profiles
    set balance = balance + v_reward,
        updated_at = now()
    where id = (
      select user_id from ptb_players
      where id = v_game.winner_player_id
        and user_id is not null
    );
  else
    -- Loser mode: everyone except the survivor (game.winner_player_id is the
    -- one stuck with the tab) gets the flat buy_in bonus.
    update ptb_profiles
    set balance = balance + v_game.buy_in,
        updated_at = now()
    where id in (
      select user_id from ptb_players
      where game_id = p_game_id
        and id <> v_game.winner_player_id
        and user_id is not null
    );
  end if;

  update ptb_games set settled_at = now() where id = p_game_id;
end;
$$;

-- Allow anon + authenticated clients to call the function. Internal logic
-- enforces idempotency and pulls all reward data server-side, so this is
-- safe to expose.
grant execute on function ptb_settle_game(uuid) to anon, authenticated;
