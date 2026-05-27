-- Phase 4c — AI-generated avatars
--
-- Users can spend eyeBucks to generate stylized portraits from an
-- uploaded selfie. Each generation costs 200 eyeBucks, deducted
-- atomically via ptb_charge_avatar(). The server route that actually
-- talks to OpenAI calls this RPC FIRST (so we don't credit failed
-- generations) and writes the resulting image URL after upload.

alter table ptb_profiles
  add column if not exists avatar_url text,
  add column if not exists avatar_style text;

-- Generation history — every successful generation lands here so
-- users can browse their gallery and re-equip a past avatar.
create table if not exists ptb_avatars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  style_slug text not null,
  image_url text not null,
  cost_eyebucks int not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ptb_avatars_user
  on ptb_avatars(user_id, created_at desc);

alter table ptb_avatars enable row level security;

drop policy if exists "ptb_avatars_select_own" on ptb_avatars;
create policy "ptb_avatars_select_own" on ptb_avatars
  for select using (auth.uid() = user_id);
-- Inserts go through the server route after a successful generation.
-- We allow authenticated inserts but constrain user_id = auth.uid().
drop policy if exists "ptb_avatars_insert_own" on ptb_avatars;
create policy "ptb_avatars_insert_own" on ptb_avatars
  for insert with check (auth.uid() = user_id);

-- ─── Style catalog (so we can show in the picker, theme-agnostic) ──
create table if not exists ptb_avatar_styles (
  slug text primary key,
  name text not null,
  prompt_suffix text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

alter table ptb_avatar_styles enable row level security;
drop policy if exists "ptb_avatar_styles_select_all" on ptb_avatar_styles;
create policy "ptb_avatar_styles_select_all" on ptb_avatar_styles
  for select using (true);

insert into ptb_avatar_styles (slug, name, prompt_suffix, sort_order)
values
  ('wanted-poster',  'Wanted Poster',  'as a sepia-toned wanted-poster portrait, ink and watercolor on aged parchment, frontier western style', 0),
  ('saloon-oil',     'Saloon Oil',     'as a moody oil painting in the style of a late-1800s saloon portrait, warm lamplight, rich umber background', 1),
  ('synthwave',      'Synthwave',      'as a neon synthwave portrait, magenta and cyan rim lighting, chrome reflections, retrofuturistic 1980s vibe', 2),
  ('pixel-hero',     'Pixel Hero',     'as a chunky 16-bit pixel-art portrait, arcade fighting-game character select screen, vivid palette', 3),
  ('comic-ink',      'Comic Ink',      'as a bold black-and-white comic-book ink portrait, heavy crosshatching, halftone shading', 4),
  ('watercolor',     'Watercolor',     'as a loose watercolor portrait, soft washes, gentle paper bleed, modern illustration style', 5)
on conflict (slug) do update set
  name = excluded.name,
  prompt_suffix = excluded.prompt_suffix,
  sort_order = excluded.sort_order;

-- ─── Charge RPC: deduct 200 eyeBucks atomically before generation ─
-- Returns the new balance. Raises if not enough eyeBucks. The server
-- route calls this *before* hitting the OpenAI API — if generation
-- fails after charging, the server route MUST call ptb_refund_avatar.
create or replace function ptb_charge_avatar()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_cost int := 200;
  v_balance int;
begin
  if v_user_id is null then raise exception 'Not signed in'; end if;

  select balance into v_balance from ptb_profiles where id = v_user_id for update;
  if v_balance is null then raise exception 'No profile'; end if;
  if v_balance < v_cost then
    raise exception 'Not enough eyeBucks (need %, have %)', v_cost, v_balance;
  end if;

  update ptb_profiles
    set balance = balance - v_cost, updated_at = now()
    where id = v_user_id
    returning balance into v_balance;

  return v_balance;
end;
$$;
grant execute on function ptb_charge_avatar() to authenticated;

create or replace function ptb_refund_avatar()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_refund int := 200;
  v_balance int;
begin
  if v_user_id is null then raise exception 'Not signed in'; end if;
  update ptb_profiles
    set balance = balance + v_refund, updated_at = now()
    where id = v_user_id
    returning balance into v_balance;
  return v_balance;
end;
$$;
grant execute on function ptb_refund_avatar() to authenticated;

-- ─── Storage bucket for generated avatars ─────────────────────────
-- Public bucket so the avatar URL is directly servable in <img>. Path
-- convention is `<user_id>/<uuid>.png`. RLS rules below mirror the
-- table's ownership policy.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
