# RideCompare

A Skyscanner-style price comparison site for self-drive car rentals. Shows cached prices from multiple providers (Zoomcar, Revv, Myles, DriveDilSe) side by side, refreshed periodically by a scraper — not live-per-search (see "Why cached, not live" below).

## Stack
- Frontend: Next.js (App Router), deployed on Vercel
- Data: Supabase Postgres, one public-readable `listings` table
- Refresh: `scripts/scrape.mjs` (Playwright + Supabase), run every 2 hours by a GitHub Actions workflow

## Setup (new machine / first time)

1. Install Node.js, `gh` CLI, `npm i -g vercel supabase`
2. Create a **new** Supabase project (separate from any other project) at https://supabase.com/dashboard
3. Apply the migration: `supabase link --project-ref <your-ref>` then `supabase db push` (or paste `supabase/migrations/0001_listings.sql` into the SQL editor)
4. Copy `.env.example` to `.env.local` in the repo root, fill in your project's URL and anon key (Project Settings → API)
5. `npm install` at the repo root, `npm run dev` to preview locally at http://localhost:3000
6. `vercel link` to create/connect a Vercel project, then set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` as Vercel env vars (same values as `.env.local`)
7. In the GitHub repo settings → Secrets, add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (service role, **not** anon — from Project Settings → API) so `.github/workflows/scrape.yml` can write listings
8. `cd scripts && npm install` to set up the scraper locally if you want to test it before relying on the scheduled workflow

## Before trusting the scheduled scrape
`scripts/scrape.mjs`'s Zoomcar/Revv/Myles adapters have **placeholder CSS selectors** — these sites are JS-rendered SPAs and the selectors were written without live browser access to verify them. Run:

```
cd scripts
node scrape.mjs --dry-run --site=revv
```

for each provider and fix the selectors against the live DOM (open devtools on the real site) before enabling `workflow_dispatch`/the cron for real. The `drivedilse` adapter needs no fixing — it reads DriveDilSe's public `GET /fleet/` JSON endpoint directly.

## Why cached, not live-per-search
Scraping 3 JS-heavy SPAs on every visitor search would be slow (10-30s+ per provider) and risks the providers rate-limiting or blocking the server's IP. Instead the scraper runs on a schedule, results land in `listings`, and the site reads that table directly — pages show "Updated Xm/h ago" so the cache staleness is transparent to users.

## Adding a 5th+ provider
Add a new adapter function in `scripts/scrape.mjs` (browser-based, following the Zoomcar/Revv/Myles pattern, or a plain `fetch()` if it has a JSON API like DriveDilSe), add its display name/link to `PROVIDER_LABELS`/`PROVIDER_LINKS` in `lib/supabase.ts`, and check its `robots.txt` first.
