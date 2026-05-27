-- Add game mode + wager to support "stuck with the tab" sole-loser games.
-- 'winner' (default) keeps existing behavior: last buck wins the pot.
-- 'loser'  flips the framing: last buck = stuck with the tab. Same mechanics.

alter table ptb_games
  add column if not exists mode text not null default 'winner',
  add column if not exists wager text;

alter table ptb_games
  add constraint ptb_games_mode_check check (mode in ('winner', 'loser'));
