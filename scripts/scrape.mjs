// RideCompare scraper -- run periodically (see .github/workflows/scrape.yml)
// to refresh public/listings with each provider's current prices.
//
// This adapts the provider-per-function pattern from DriveDilSe's own
// smart-pricing scraper (drivedilse.com/scripts/competitor-pricing/scrape.mjs).
// One key difference: DriveDilSe's own prices don't need browser scraping --
// they come straight from its public `GET /fleet/` JSON endpoint.
//
// Zoomcar adapter uses selectors verified live on 2026-07-12 against
// https://www.zoomcar.com/pune (see scripts/inspect.mjs, a throwaway
// devtools-less inspection helper) -- that page lists cars grouped into
// per-category carousels (SUV / Hatchback / MUV-MPV) with no search
// interaction needed, so no `/search?` URL (disallowed by robots.txt)
// is ever touched. Prices there are hourly (`₹NNN/hr`); converted to an
// approximate daily rate via `HOURLY_TO_DAILY_FACTOR` below since
// Zoomcar's real per-day rate includes volume discounts this can't see.
//
// Revv and Myles are still unresolved: revv.co.in/self-drive-cars/pune
// 404s (nav links didn't resolve to a real per-city listing URL in
// testing) and myles.com has a broken TLS certificate (cert error on
// both myles.com and www.myles.com as of 2026-07-12) -- possibly a
// stale/wrong domain. Both need a human to find the correct working
// URL before an adapter can be written for them.

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");
const SITE_FILTER = process.argv.find((a) => a.startsWith("--site="))?.split("=")[1];

const CITY = "Pune";
const CATEGORIES = ["Hatchback", "Sedan", "SUV", "MPV"];
const REQUEST_DELAY_MS = 4000;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const HOURLY_TO_DAILY_FACTOR = 20; // approximation: real day-rates undercut hourly*24 via volume discount

const DRIVEDILSE_API = "https://fuesnifgaiivcapppexw.supabase.co/functions/v1";
// DriveDilSe's public anon key -- same one embedded in drivedilse.com's
// own page source (index.html), required by Supabase Edge Functions as
// an `Authorization` header even for endpoints meant to be public.
const DRIVEDILSE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1ZXNuaWZnYWlpdmNhcHBwZXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2ODgzMDksImV4cCI6MjA5NTI2NDMwOX0.R4UjqPMiXqdAunW-cECs5i2yap8lr9TJH8ocOjCYMic";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function parsePrice(text) {
  const digits = text.replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

// --- adapters -------------------------------------------------------
// Each adapter returns [{ category, price_per_day, car_name }].
// Browser-based adapters take (page); the DriveDilSe adapter needs no
// browser at all since it's a plain JSON API.

// Zoomcar's category carousel headings don't exactly match our category
// names -- map their heading text (substring match) to ours.
const ZOOMCAR_CATEGORY_MAP = [
  ["SUV", "SUV"],
  ["MUV/MPV", "MPV"],
  ["Hatchback", "Hatchback"],
  ["Sedan", "Sedan"],
];

const browserAdapters = {
  zoomcar: async (page) => {
    await page.goto(`https://www.zoomcar.com/${CITY.toLowerCase()}`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForTimeout(2000);

    const raw = await page.evaluate(() => {
      const heads = Array.from(document.querySelectorAll("h2.home-carousel-new-header-text"));
      const out = [];
      for (const h of heads) {
        let node = h;
        let cards = [];
        for (let i = 0; i < 6 && node; i++) {
          node = node.parentElement;
          if (!node) break;
          const found = node.querySelectorAll(".car-card");
          if (found.length > 0) {
            cards = Array.from(found);
            break;
          }
        }
        for (const card of cards) {
          const name = card.querySelector(".car-name")?.textContent.trim() || null;
          const priceText = card.querySelector(".price-current")?.textContent.trim() || "";
          out.push({ heading: h.textContent.trim(), name, priceText });
        }
      }
      return out;
    });

    const rows = [];
    for (const r of raw) {
      const category = ZOOMCAR_CATEGORY_MAP.find(([label]) => r.heading.includes(label))?.[1];
      const hourly = parsePrice(r.priceText);
      if (!category || !hourly) continue;
      rows.push({ category, price_per_day: Math.round(hourly * HOURLY_TO_DAILY_FACTOR), car_name: r.name });
    }
    return rows;
  },

  // Unresolved -- see header comment. revv.co.in/self-drive-cars/<city>
  // 404s; needs the real per-city listing URL.
  revv: async (page) => {
    await page.goto(`https://www.revv.co.in/self-drive-cars/${CITY.toLowerCase()}`, {
      waitUntil: "domcontentloaded",
    });
    return [];
  },

  // Unresolved -- see header comment. myles.com has a broken TLS cert.
  myles: async (page) => {
    await page.goto(`https://myles.com/self-drive-cars-${CITY.toLowerCase()}`, {
      waitUntil: "domcontentloaded",
    });
    return [];
  },
};

// DriveDilSe's own categories are finer-grained ("Compact Hatchback",
// "Compact SUV") than the 4 buckets this site searches by -- normalize
// so those cars actually show up in results instead of silently
// vanishing from every search.
function normalizeCategory(category) {
  if (/hatchback/i.test(category)) return "Hatchback";
  if (/suv/i.test(category)) return "SUV";
  if (/sedan/i.test(category)) return "Sedan";
  if (/mpv|muv/i.test(category)) return "MPV";
  return category;
}

async function scrapeDrivedilse() {
  const res = await fetch(`${DRIVEDILSE_API}/fleet/`, {
    headers: { Authorization: `Bearer ${DRIVEDILSE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`DriveDilSe fleet fetch failed: ${res.status}`);
  const cars = await res.json();
  return cars
    .filter((c) => c.active !== false)
    .map((c) => ({ category: normalizeCategory(c.category), price_per_day: c.pricePerDay, car_name: c.name }));
}

async function scrapeBrowserProvider(browser, name, adapter) {
  const results = [];
  const context = await browser.newContext({ userAgent: USER_AGENT });
  const page = await context.newPage();
  try {
    const rows = await adapter(page);
    for (const r of rows) {
      if (r.price_per_day) results.push(r);
    }
  } catch (err) {
    console.error(`[${name}] failed:`, err.message);
  }
  await context.close();
  await sleep(REQUEST_DELAY_MS);
  return results;
}

async function main() {
  const allRows = [];

  if (!SITE_FILTER || SITE_FILTER === "drivedilse") {
    console.log("Fetching drivedilse...");
    try {
      const rows = await scrapeDrivedilse();
      console.log(`  -> ${rows.length} prices`);
      for (const r of rows) allRows.push({ provider: "drivedilse", city: CITY, ...r });
    } catch (err) {
      console.error("[drivedilse] failed:", err.message);
    }
  }

  const browserTargets = Object.entries(browserAdapters).filter(
    ([name]) => !SITE_FILTER || name === SITE_FILTER,
  );
  if (browserTargets.length > 0) {
    const browser = await chromium.launch({ headless: true });
    for (const [name, adapter] of browserTargets) {
      console.log(`Scraping ${name}...`);
      const rows = await scrapeBrowserProvider(browser, name, adapter);
      console.log(`  -> ${rows.length} prices`);
      for (const r of rows) allRows.push({ provider: name, city: CITY, ...r });
    }
    await browser.close();
  }

  if (DRY_RUN) {
    console.log("DRY RUN -- not writing to Supabase. Rows:", JSON.stringify(allRows, null, 2));
    return;
  }

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const providers = [...new Set(allRows.map((r) => r.provider))];
  if (providers.length > 0) {
    const { error: delErr } = await sb.from("listings").delete().in("provider", providers).eq("city", CITY);
    if (delErr) throw delErr;
  }
  if (allRows.length > 0) {
    const { error } = await sb.from("listings").insert(allRows);
    if (error) throw error;
  }
  console.log(`Wrote ${allRows.length} listings across ${providers.length} providers.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
