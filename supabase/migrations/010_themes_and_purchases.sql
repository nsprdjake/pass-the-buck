-- Phase 3 — New themes (full re-skins) + eyeBuck top-up purchase ladder
--
-- Adds three non-vintage themes (Retro, Techno, Arcade) to the catalog so
-- the existing buy/equip flow on /profile picks them up automatically.
--
-- Also introduces the wallet top-up rails:
--   - ptb_eyebucks_bundles : pricing catalog (cents → eyeBucks)
--   - ptb_eyebucks_purchases : audit ledger
--   - ptb_test_purchase_bundle(text) : TEST-MODE crediting RPC
--
-- The test RPC stamps every purchase with status='test'. When we wire up
-- real Stripe Checkout, the webhook handler will insert with status='pending'
-- and later flip to 'complete' — the schema is already laid down for that.

-- ─── New themes ────────────────────────────────────────────────────
-- Pricing is intentionally above the existing vintage themes; these are
-- bigger visual departures so they read as a tier-up.
insert into ptb_themes (slug, name, tagline, price_eyebucks, sort_order, is_default)
values
  ('retro',  'Retro',  '80s synthwave — neon grids and chrome',                  2500, 5, false),
  ('techno', 'Techno', 'After-hours rave — black light and lasers',              3000, 6, false),
  ('arcade', 'Arcade', 'Token-fed CRT pixels — quarters and high scores',        4500, 7, false)
on conflict (slug) do nothing;

-- ─── Bundle catalog ────────────────────────────────────────────────
create table if not exists ptb_eyebucks_bundles (
  id text primary key,
  label text not null,
  tagline text,
  price_cents int not null check (price_cents > 0),
  amount_eyebucks int not null check (amount_eyebucks > 0),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table ptb_eyebucks_bundles enable row level security;
drop policy if exists "ptb_bundles_select_all" on ptb_eyebucks_bundles;
create policy "ptb_bundles_select_all" on ptb_eyebucks_bundles
  for select using (true);

-- "Cheap to start" ladder: ~$0.005 / eyeBuck at the top tier, ~$0.005
-- at baseline too. Friendly first purchase price, mild bulk discount.
insert into ptb_eyebucks_bundles
  (id, label, tagline, price_cents, amount_eyebucks, sort_order)
values
  ('starter', 'Starter Stack', 'Just enough to try a theme on',          99,  200, 0),
  ('hand',    'Hand of Bucks', 'A solid evening at the table',          299,  700, 1),
  ('roll',    'Big Roll',      'Buy the room a round',                  499, 1300, 2),
  ('high',    'High Roller',   'Stake the whole season',                999, 3000, 3)
on conflict (id) do update set
  label = excluded.label,
  tagline = excluded.tagline,
  price_cents = excluded.price_cents,
  amount_eyebucks = excluded.amount_eyebucks,
  sort_order = excluded.sort_order;

-- ─── Purchase audit ledger ─────────────────────────────────────────
create table if not exists ptb_eyebucks_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bundle_id text not null references ptb_eyebucks_bundles(id),
  amount_eyebucks int not null,
  price_cents int not null,
  status text not null check (status in ('test', 'pending', 'complete', 'refunded')),
  ext_session_id text,         -- Stripe checkout session ID, later
  ext_payment_intent text,     -- Stripe payment intent ID, later
  created_at timestamptz not null default now()
);

create index if not exists idx_ptb_eb_purchases_user
  on ptb_eyebucks_purchases(user_id, created_at desc);
create index if not exists idx_ptb_eb_purchases_ext
  on ptb_eyebucks_purchases(ext_session_id);

alter table ptb_eyebucks_purchases enable row level security;
drop policy if exists "ptb_eb_purchases_select_own" on ptb_eyebucks_purchases;
create policy "ptb_eb_purchases_select_own" on ptb_eyebucks_purchases
  for select using (auth.uid() = user_id);
-- No client inserts/updates — that all flows through RPCs / future webhook.

-- ─── RPC: TEST-MODE credit a bundle ───────────────────────────────
-- ⚠ Crediting eyeBucks here is NOT gated on payment. Safe to call from
-- a clearly-labeled "TEST MODE" button while we're wiring Stripe.
-- Swap to status='pending' inserts from a server-side webhook before
-- shipping a public production build.
create or replace function ptb_test_purchase_bundle(p_bundle_id text)
returns table(purchase_id uuid, new_balance int, amount_eyebucks int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_bundle ptb_eyebucks_bundles%rowtype;
  v_purchase_id uuid;
  v_new_balance int;
begin
  if v_user_id is null then raise exception 'Not signed in'; end if;

  select * into v_bundle
    from ptb_eyebucks_bundles
    where id = p_bundle_id and is_active;
  if not found then raise exception 'Unknown or inactive bundle'; end if;

  insert into ptb_eyebucks_purchases
    (user_id, bundle_id, amount_eyebucks, price_cents, status)
  values
    (v_user_id, v_bundle.id, v_bundle.amount_eyebucks, v_bundle.price_cents, 'test')
  returning id into v_purchase_id;

  -- Lock + credit the balance atomically.
  update ptb_profiles
    set balance = balance + v_bundle.amount_eyebucks,
        updated_at = now()
    where id = v_user_id
    returning balance into v_new_balance;

  -- Count toward total-earned for stats consistency. Doesn't affect
  -- streak / win count — top-ups aren't earnings.
  update ptb_stats
    set total_earned_eyebucks = total_earned_eyebucks + v_bundle.amount_eyebucks,
        updated_at = now()
    where user_id = v_user_id;

  return query
    select v_purchase_id,
           coalesce(v_new_balance, 0),
           v_bundle.amount_eyebucks;
end;
$$;

grant execute on function ptb_test_purchase_bundle(text) to authenticated;
