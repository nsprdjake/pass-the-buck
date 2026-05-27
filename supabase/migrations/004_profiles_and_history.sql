-- Auth-aware identity + game history.
--
-- Adds a profile table (1:1 with auth.users) to hold a persistent display
-- name and color across devices. Anon play still works — every column that
-- references auth.users is nullable and the existing device_id / claim_token
-- model continues to gate writes during a game.

create table if not exists ptb_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table ptb_profiles enable row level security;

-- Anyone can read a profile (used to render names/colors in shared games);
-- only the owner can write to their own profile.
drop policy if exists "ptb_profiles_select_all" on ptb_profiles;
drop policy if exists "ptb_profiles_insert_self" on ptb_profiles;
drop policy if exists "ptb_profiles_update_self" on ptb_profiles;
create policy "ptb_profiles_select_all" on ptb_profiles for select using (true);
create policy "ptb_profiles_insert_self" on ptb_profiles for insert with check (auth.uid() = id);
create policy "ptb_profiles_update_self" on ptb_profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create a blank profile when a new auth user signs up.
create or replace function ptb_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ptb_profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ptb_on_auth_user_created on auth.users;
create trigger ptb_on_auth_user_created
  after insert on auth.users
  for each row execute function ptb_handle_new_user();

-- Backfill profile rows for any users that already exist before this migration.
insert into ptb_profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- Optional user association on games + players. Nullable — anon play continues
-- to work. Used for "my game history" and cross-device identity.
alter table ptb_games
  add column if not exists host_user_id uuid references auth.users(id) on delete set null;

alter table ptb_players
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_ptb_players_user
  on ptb_players(user_id) where user_id is not null;
create index if not exists idx_ptb_games_host_user
  on ptb_games(host_user_id) where host_user_id is not null;

-- Profile updates flow through realtime (nice-to-have for future cross-device
-- avatar/name changes mid-game).
alter publication supabase_realtime add table ptb_profiles;
