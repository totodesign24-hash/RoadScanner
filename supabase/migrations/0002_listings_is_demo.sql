-- Revv and Myles don't have working scrapers yet (revv.co.in/self-drive-cars/pune
-- 404s, myles.com has a broken TLS cert) -- until someone finds their real
-- URLs and fixes those adapters in scripts/scrape.mjs, they're seeded with
-- clearly-fictional placeholder data (scripts/seed-demo-data.mjs) so the
-- site isn't missing 2 of its 4 providers. `is_demo` lets the UI label
-- those rows honestly instead of presenting invented numbers as real
-- scraped prices.
alter table public.listings add column if not exists is_demo boolean not null default false;
