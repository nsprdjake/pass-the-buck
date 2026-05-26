-- Players/auth handled by Supabase Auth

create table games (
  id uuid primary key default gen_random_uuid(),
  code text unique not null, -- 6-char join code
  host_id uuid references auth.users(id),
  status text not null default 'lobby', -- lobby, active, finished
  buy_in int not null default 3, -- bucks per player
  turn_timer_seconds int, -- null = no timer
  current_turn_index int default 0,
  pot int default 0,
  winner_id uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade,
  user_id uuid references auth.users(id),
  display_name text not null,
  bucks int not null default 3,
  is_out boolean default false,
  seat_index int not null,
  created_at timestamptz default now()
);

create table turns (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade,
  player_id uuid references players(id),
  outcomes jsonb not null, -- array of {die: 1-3, result: "left"|"right"|"center"|"keep"}
  created_at timestamptz default now()
);

-- Indexes
create index idx_players_game on players(game_id);
create index idx_turns_game on turns(game_id);
create index idx_games_code on games(code);

-- RLS
alter table games enable row level security;
alter table players enable row level security;
alter table turns enable row level security;

-- Policies: anyone authenticated can read games they're in
create policy "Players can view their game" on games for select using (
  id in (select game_id from players where user_id = auth.uid())
  or host_id = auth.uid()
);

create policy "Host can update game" on games for update using (host_id = auth.uid());

create policy "Players can view players in their game" on players for select using (
  game_id in (select game_id from players where user_id = auth.uid())
);

create policy "Players can view turns in their game" on turns for select using (
  game_id in (select game_id from players where user_id = auth.uid())
);
