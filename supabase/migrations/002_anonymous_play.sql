-- Drop the original auth-coupled schema (no production rows yet)
drop policy if exists "Players can view their game" on ptb_games;
drop policy if exists "Host can update game" on ptb_games;
drop policy if exists "Players can view players in their game" on ptb_players;
drop policy if exists "Players can view turns in their game" on ptb_turns;
drop table if exists ptb_turns cascade;
drop table if exists ptb_players cascade;
drop table if exists ptb_games cascade;

create extension if not exists pgcrypto;

-- Games: identified by a short shareable code. Host holds a secret token.
create table ptb_games (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_token text not null,
  status text not null default 'lobby', -- lobby | active | finished
  buy_in int not null default 3,
  pot int not null default 0,
  current_seat int not null default 0,
  round int not null default 1,
  winner_player_id uuid,
  last_turn jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Players: identified by a device_id (random localStorage UUID per device)
-- and gated on writes by a claim_token returned at join time.
create table ptb_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references ptb_games(id) on delete cascade,
  device_id text not null,
  claim_token text not null,
  display_name text not null,
  color text not null,
  seat int not null,
  bucks int not null default 0,
  is_host boolean not null default false,
  created_at timestamptz not null default now()
);

-- Turn log: append-only history of rolls, for replay on late joiners and audit.
create table ptb_turns (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references ptb_games(id) on delete cascade,
  player_id uuid references ptb_players(id) on delete set null,
  round int not null,
  outcomes jsonb not null,
  transfers jsonb not null,
  pot_after int not null,
  created_at timestamptz not null default now()
);

create index idx_ptb_players_game on ptb_players(game_id);
create index idx_ptb_turns_game on ptb_turns(game_id, created_at desc);

-- Permissive RLS — invite code is the security boundary for this casual game.
alter table ptb_games enable row level security;
alter table ptb_players enable row level security;
alter table ptb_turns enable row level security;

create policy "ptb_games_select" on ptb_games for select using (true);
create policy "ptb_games_insert" on ptb_games for insert with check (true);
create policy "ptb_games_update" on ptb_games for update using (true) with check (true);
create policy "ptb_games_delete" on ptb_games for delete using (true);

create policy "ptb_players_select" on ptb_players for select using (true);
create policy "ptb_players_insert" on ptb_players for insert with check (true);
create policy "ptb_players_update" on ptb_players for update using (true) with check (true);
create policy "ptb_players_delete" on ptb_players for delete using (true);

create policy "ptb_turns_select" on ptb_turns for select using (true);
create policy "ptb_turns_insert" on ptb_turns for insert with check (true);

-- Realtime for live updates
alter publication supabase_realtime add table ptb_games;
alter publication supabase_realtime add table ptb_players;
alter publication supabase_realtime add table ptb_turns;
