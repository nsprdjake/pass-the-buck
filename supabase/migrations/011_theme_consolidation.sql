-- Phase 4a — Consolidate themes down to 4 distinct, well-defined options.
--
-- Retire Cantina, Old Money, Riverboat, and Techno. The first three were
-- too close to Saloon visually; Techno was too close to Retro. Surviving
-- four (Saloon, Speakeasy, Retro, Arcade) each have unique fonts +
-- layouts so the player gets a real change when switching.
--
-- Anyone who owned a retired theme is fully refunded its eyeBuck price.
-- Anyone with a retired theme currently active is bumped back to Saloon.

-- ─── Add is_active flag so we can soft-retire ─────────────────────
alter table ptb_themes
  add column if not exists is_active boolean not null default true;

-- ─── Reset anyone using a retiring theme back to saloon ────────────
update ptb_profiles
  set active_theme_slug = 'saloon',
      updated_at = now()
  where active_theme_slug in ('cantina', 'old-money', 'riverboat', 'techno');

-- ─── Refund eyeBucks for retired theme ownership ──────────────────
-- We refund the full price each user paid (per ptb_themes.price_eyebucks
-- at time of retirement), once per (user, theme).
do $$
declare
  r record;
  refund_amount int;
begin
  for r in
    select ot.user_id, ot.theme_slug, t.price_eyebucks
      from ptb_owned_themes ot
      join ptb_themes t on t.slug = ot.theme_slug
      where ot.theme_slug in ('cantina', 'old-money', 'riverboat', 'techno')
        and t.price_eyebucks > 0
  loop
    refund_amount := r.price_eyebucks;
    update ptb_profiles
      set balance = balance + refund_amount,
          updated_at = now()
      where id = r.user_id;
    -- We don't update total_earned_eyebucks: this isn't earnings, it's
    -- a return-to-shelf refund. Stats stay clean.
  end loop;
end$$;

-- ─── Soft-retire the four themes (kept in catalog for history) ─────
update ptb_themes
  set is_active = false
  where slug in ('cantina', 'old-money', 'riverboat', 'techno');

-- ─── Sharpen the surviving four (refresh taglines + sort order) ────
update ptb_themes set
  tagline = 'Frontier scrip, bone dice, deep-felt poker table',
  sort_order = 0
  where slug = 'saloon';

update ptb_themes set
  tagline = 'Prohibition jazz — emerald velvet and black walnut',
  sort_order = 1
  where slug = 'speakeasy';

update ptb_themes set
  tagline = '80s synthwave — neon grids and chrome',
  price_eyebucks = 2000,
  sort_order = 2
  where slug = 'retro';

update ptb_themes set
  tagline = 'CRT cabinet — amber phosphor, red HUD, scanlines',
  price_eyebucks = 3500,
  sort_order = 3
  where slug = 'arcade';
