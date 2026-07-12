-- ============================================================
-- RideCompare: cached price listings shown directly on the
-- public site. No PII/bookings here (that's DriveDilSe's job),
-- so unlike drivedilse.com's tables, `listings` is intentionally
-- public-readable -- the frontend queries it directly with the
-- anon key (see lib/supabase.ts). Only the scraper (service_role,
-- via scripts/scrape.mjs run from GitHub Actions) can write.
-- ============================================================

create table if not exists public.listings (
  id            uuid primary key default gen_random_uuid(),
  provider      text not null,
  category      text not null,
  city          text not null,
  price_per_day int not null,
  car_name      text,
  scraped_at    timestamptz not null default now()
);

create index if not exists listings_city_category_price_idx
  on public.listings (city, category, price_per_day);

alter table public.listings enable row level security;
alter table public.listings force row level security;

-- Public read-only.
create policy "Public can read listings"
  on public.listings for select
  to anon, authenticated
  using (true);

-- No insert/update/delete policy for anon/authenticated -> only
-- service_role (which bypasses RLS) can write, i.e. only the
-- scraper using SUPABASE_SERVICE_ROLE_KEY.
