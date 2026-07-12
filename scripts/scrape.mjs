// RideCompare scraper -- run periodically (see .github/workflows/scrape.yml)
// to refresh public/listings with each provider's current prices.
//
// This adapts the provider-per-function pattern from DriveDilSe's own
// smart-pricing scraper (drivedilse.com/scripts/competitor-pricing/scrape.mjs).
// One key difference: DriveDilSe's own prices don't need browser scraping --
// they come straight from its public `GET /fleet/` JSON endpoint.
//
// IMPORTANT: the Zoomcar/Revv/Myles adapters use placeholder selectors,
// same caveat as the DriveDilSe smart-pricing scraper -- these are
// JS-rendered SPAs and the selectors below were written without live
// browser access to verify them. Run `node scrape.mjs --dry-run --site=<name>`
// and fix selectors against the live DOM before trusting the scheduled run.
//
// robots.txt rules honored (checked 2026-07-12, same audit as DriveDilSe's
// competitor-pricing scraper): Zoomcar disallows `/search?` and other
// query-param paths (adapter must reach prices via UI navigation, never by
// loading a disallowed URL); Revv has no disallow rules; Myles disallows
// only tracking/sort/filter query params and `/search`.

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");
const SITE_FILTER = process.argv.find((a) => a.startsWith("--site="))?.split("=")[1];

const CITY = "Pune";
const CATEGORIES = ["Hatchback", "Sedan", "SUV", "MPV"];
const REQUEST_DELAY_MS = 4000;
const USER_AGENT = "RideCompareBot/1.0 (+https://ridecompare.example; price comparison, respects robots.txt)";

const DRIVEDILSE_API = "https://fuesnifgaiivcapppexw.supabase.co/functions/v1";

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

const browserAdapters = {
  zoomcar: async (page) => {
    await page.goto("https://www.zoomcar.com/", { waitUntil: "domcontentloaded" });
    // PLACEHOLDER SELECTORS -- verify against the live site:
    // for (const category of CATEGORIES) {
    //   await page.fill('[data-testid="city-input"]', CITY);
    //   await page.click(`[data-testid="category-filter-${category.toLowerCase()}"]`);
    //   const cards = await page.$$('[data-testid="car-price"]');
    //   ...
    // }
    return [];
  },

  revv: async (page) => {
    await page.goto(`https://www.revv.co.in/self-drive-cars/${CITY.toLowerCase()}`, {
      waitUntil: "domcontentloaded",
    });
    // PLACEHOLDER SELECTORS -- verify against the live site.
    return [];
  },

  myles: async (page) => {
    await page.goto(`https://myles.com/self-drive-cars-${CITY.toLowerCase()}`, {
      waitUntil: "domcontentloaded",
    });
    // PLACEHOLDER SELECTORS -- verify against the live site.
    return [];
  },
};

async function scrapeDrivedilse() {
  const res = await fetch(`${DRIVEDILSE_API}/fleet/`);
  if (!res.ok) throw new Error(`DriveDilSe fleet fetch failed: ${res.status}`);
  const cars = await res.json();
  return cars
    .filter((c) => c.active !== false)
    .map((c) => ({ category: c.category, price_per_day: c.pricePerDay, car_name: c.name }));
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
