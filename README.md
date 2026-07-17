# RideCompare

A Skyscanner-style price comparison site for self-drive car rentals. Shows cached prices from multiple providers side by side, refreshed periodically by a scraper — not live-per-search (see "Why cached, not live" below).

Live at: https://roadscanner-three.vercel.app

## Current provider status (Pune)
- **DriveDilSe** — real, live data via their public `GET /fleet/` JSON API.
- **Zoomcar** — real, live data scraped from `zoomcar.com/pune` (headless browser, verified selectors).
- **Revv** — fictional placeholder data, marked `ESTIMATED` in the UI. Their real per-city URL (`revv.co.in/self-drive-cars/pune`) 404s; their homepage's "Car Rental in Pune" link uses client-side routing that wasn't traced to a real URL. Needs someone to find it.
- **Myles** — no data, and none seeded. `myles.com` is a dead/wrong domain (TLS cert for an unrelated site, confirmed with `openssl s_client -connect myles.com:443`). The real site is `mylescars.com`, but per their own city list Pune is "Subscription" only, not "Self-drive" — they don't offer this product there. Nothing to fix unless that changes.

## Stack
- Frontend: Next.js (App Router), deployed on Vercel
- Data: Supabase Postgres, one public-readable `listings` table (`is_demo` column flags fictional rows)
- Refresh: `scripts/scrape.mjs` (Playwright + Supabase), run every 2 hours by a GitHub Actions workflow

## Setup (new machine / first time)

1. Install Node.js, `gh` CLI, `npm i -g vercel supabase`
2. Create a **new** Supabase project (separate from any other project) at https://supabase.com/dashboard
3. Apply migrations `supabase/migrations/0001_listings.sql` and `0002_listings_is_demo.sql` via the SQL editor (or `supabase db push`)
4. Copy `.env.example` to `.env.local` in the repo root, fill in your project's URL and anon key (Project Settings → API)
5. `npm install` at the repo root, `npm run dev` to preview locally at http://localhost:3000
6. `vercel link` to create/connect a Vercel project, then set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` as Vercel env vars (same values as `.env.local`)
7. In the GitHub repo settings → Secrets, add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (service role, **not** anon — from Project Settings → API) so `.github/workflows/scrape.yml` can write listings
8. `cd scripts && npm install && npx playwright install chromium` to set up the scraper locally

## Fixing Revv
`revv.co.in/self-drive-cars/pune` 404s. To fix: open `revv.co.in` in a real browser, find the actual working Pune listing URL (their nav link uses client-side routing), then either hardcode it or replicate the click-through in `scripts/scrape.mjs`'s `revv` adapter (currently returns `[]`). `scripts/inspect.mjs <url>` is a standing dev tool for finding real CSS selectors on any provider's page without needing devtools — `node inspect.mjs <url>` dumps price-like elements and page text. Once real data flows, `scrape.mjs`'s existing delete-then-insert cycle will automatically replace the fictional `is_demo=true` Revv rows — no manual cleanup needed, just delete the Revv block from `scripts/seed-demo-data.mjs` once it's no longer needed.

## Known Zoomcar scraper limitation
Category carousels lazy-load on scroll; `scrape.mjs` scrolls through the page before reading the DOM to trigger all of them, but this occasionally still misses a category on a given run (observed: a run that only captured SUVs). This may partly be real inventory fluctuation (Zoomcar is a live marketplace) rather than purely a scraping bug — worth monitoring across a few scheduled runs before assuming it's broken.

## Why cached, not live-per-search
Scraping JS-heavy SPAs on every visitor search would be slow (10-30s+ per provider) and risks the providers rate-limiting or blocking the server's IP. Instead the scraper runs on a schedule, results land in `listings`, and the site reads that table directly — pages show "Updated Xm/h ago" so the cache staleness is transparent to users.

## Adding a new provider
Add a new adapter function in `scripts/scrape.mjs` (browser-based, following the Zoomcar pattern, or a plain `fetch()` if it has a JSON API like DriveDilSe), add its display name/link to `PROVIDER_LABELS`/`PROVIDER_LINKS` in `lib/supabase.ts`, and check its `robots.txt` first. Use `scripts/inspect.mjs` to find real selectors before writing the adapter — don't guess at selectors, verify them live (a placeholder-selector adapter silently returns zero rows forever with no error).

## Gotcha already hit once: Next.js fetch caching
`app/results/page.tsx` has `export const dynamic = "force-dynamic"` and `revalidate = 0` for a reason — Next.js patches global `fetch` (used by `@supabase/supabase-js`) to cache indefinitely by default in Server Components. Without those exports, the page will serve whatever it first fetched forever, regardless of what's actually in the database. Don't remove them.
