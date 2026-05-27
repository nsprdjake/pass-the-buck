# Pass the Buck

A pass-and-play LCR-style party game with cross-device multiplayer,
themed visuals, an eyeBuck economy, AI-generated avatars, and a
friends leaderboard. Next.js 16 + Supabase + Framer Motion.

## Setup

```bash
npm install
cp .env.local.example .env.local
# fill in the values (see Environment below)
npm run dev
```

Then open <http://localhost:3000>.

## Environment

All env vars live in `.env.local` (gitignored). See
[`.env.local.example`](.env.local.example) for the full list.

| Var | What | Where to get |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (RLS-safe; shipped to browser) | Same page as above |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push public VAPID key | Generated; private half lives in the `nudge-push` edge function's secrets |
| `OPENAI_API_KEY` | Server-side OpenAI key for AI avatars | <https://platform.openai.com/api-keys> |

### Adding `OPENAI_API_KEY`

This powers the Avatar Studio panel on `/profile`. Without it the
generator UI still renders but the server route returns a clean 503.

1. Create a key at <https://platform.openai.com/api-keys>.
2. Make sure billing is enabled and your org is verified
   (`Settings → Organization → General → Verify Organization`).
   `gpt-image-1` requires a verified org or it 403s on the first call.
3. Paste it into `.env.local`:
   ```
   OPENAI_API_KEY=sk-...
   ```
4. **Restart the dev server.** Next.js only reads `.env.local` at
   startup.
5. For deployment, add the same var in your hosting dashboard
   (Vercel → Settings → Environment Variables, or Netlify → Site
   settings → Environment variables) and redeploy.

## Scripts

```bash
npm run dev      # Local dev server (Turbopack, port 3000)
npm run build    # Production build
npm run start    # Run the production build
npm run lint     # ESLint
```

## Routes

| Route | Purpose |
|---|---|
| `/` | Splash — start/continue a local game |
| `/lobby` | Add players for a local game (2–12) |
| `/game/local` | Local pass-and-play |
| `/multi`, `/multi/create`, `/multi/join`, `/multi/[code]` | Cross-device multiplayer |
| `/auth` | Sign in / sign up |
| `/profile` | Wallet, themes, power-ups, avatars, badges, text size, history |
| `/leaderboard` | Global + Friends rankings (richest, biggest pot, longest streak, most hands) |
| `/how` | How to play |
| `/api/avatars/generate` | Server route — charges 200 eB then calls OpenAI |

## Database

Supabase Postgres. Migrations live in
[`supabase/migrations/`](supabase/migrations/), applied in numeric
order. The schema is built up in 13 incremental migrations —
re-running them on a fresh project gives you a complete database.

Key tables: `ptb_profiles`, `ptb_stats`, `ptb_games`, `ptb_players`,
`ptb_themes`, `ptb_owned_themes`, `ptb_powerups`, `ptb_user_powerups`,
`ptb_achievements`, `ptb_user_achievements`, `ptb_eyebucks_bundles`,
`ptb_eyebucks_purchases`, `ptb_friends`, `ptb_avatars`,
`ptb_avatar_styles`.

## Deploy

Configured for Vercel (`vercel.json`) and Netlify (`netlify.toml`).
Both pick up the env vars from their respective dashboards. Don't
forget `OPENAI_API_KEY` if you want avatars to work in production.

## Anti-design notes

Built mobile-first. Default font-size is 18px; settings has a
Small/Medium/Large/Extra Large picker. Every list item that has
detail (badges, power-ups, themes, recent hands) opens a tap-friendly
modal rather than hiding the info behind hover/`title=`.
