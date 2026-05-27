-- Web Push subscriptions — one row per (user, device/browser).
--
-- The endpoint is the unique identifier; p256dh + auth are the
-- per-subscription crypto keys we need to encrypt the push payload before
-- handing it to the push service. We tie subscriptions to auth.users so
-- the edge function can look up "who should get pinged" given a
-- (game_id, seat) pair via ptb_players.user_id.

create table if not exists ptb_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists idx_ptb_push_subs_user
  on ptb_push_subscriptions(user_id);

alter table ptb_push_subscriptions enable row level security;

-- Users may manage their own subscription rows. The edge function uses
-- the service role and bypasses RLS for the actual push lookup.
drop policy if exists "ptb_push_subs_select_own" on ptb_push_subscriptions;
drop policy if exists "ptb_push_subs_insert_own" on ptb_push_subscriptions;
drop policy if exists "ptb_push_subs_update_own" on ptb_push_subscriptions;
drop policy if exists "ptb_push_subs_delete_own" on ptb_push_subscriptions;
create policy "ptb_push_subs_select_own" on ptb_push_subscriptions
  for select using (auth.uid() = user_id);
create policy "ptb_push_subs_insert_own" on ptb_push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "ptb_push_subs_update_own" on ptb_push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ptb_push_subs_delete_own" on ptb_push_subscriptions
  for delete using (auth.uid() = user_id);
