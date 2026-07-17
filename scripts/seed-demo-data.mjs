// Seeds clearly-fictional placeholder listings for Revv and Myles --
// their real scrapers aren't working yet (see scrape.mjs header comment:
// revv.co.in/self-drive-cars/pune 404s, myles.com has a broken TLS cert).
// Every row here is marked is_demo=true so the UI can label it honestly
// instead of presenting invented numbers as real scraped prices.
//
// Once a real adapter is written for a provider, scrape.mjs's own
// delete-then-insert cycle will replace these fictional rows with real
// ones automatically the next time it runs successfully for that
// provider -- this script never needs to be re-run or cleaned up by hand.
//
// Prices are hand-picked to sit in the same plausible range as the real
// Zoomcar/DriveDilSe data already in `listings` (roughly ₹1500-4000/day
// for hatchbacks/MPVs, ₹2500-9000 for SUVs) -- not randomly generated.
import { createClient } from "@supabase/supabase-js";

const CITY = "Pune";

const DEMO_LISTINGS = [
  // Revv -- fictional
  { provider: "revv", category: "Hatchback", price_per_day: 1750, car_name: "Maruti Swift (demo)" },
  { provider: "revv", category: "Hatchback", price_per_day: 1980, car_name: "Hyundai Grand i10 (demo)" },
  { provider: "revv", category: "Sedan", price_per_day: 2600, car_name: "Honda City (demo)" },
  { provider: "revv", category: "SUV", price_per_day: 3400, car_name: "Hyundai Creta (demo)" },
  { provider: "revv", category: "SUV", price_per_day: 4100, car_name: "Mahindra XUV500 (demo)" },
  { provider: "revv", category: "MPV", price_per_day: 3050, car_name: "Maruti Ertiga (demo)" },

  // Myles -- fictional
  { provider: "myles", category: "Hatchback", price_per_day: 1690, car_name: "Tata Tiago (demo)" },
  { provider: "myles", category: "Hatchback", price_per_day: 2100, car_name: "Maruti Baleno (demo)" },
  { provider: "myles", category: "Sedan", price_per_day: 2750, car_name: "Skoda Slavia (demo)" },
  { provider: "myles", category: "SUV", price_per_day: 3600, car_name: "Kia Seltos (demo)" },
  { provider: "myles", category: "SUV", price_per_day: 5200, car_name: "Mahindra Scorpio-N (demo)" },
  { provider: "myles", category: "MPV", price_per_day: 3200, car_name: "Toyota Innova Crysta (demo)" },
];

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const providers = [...new Set(DEMO_LISTINGS.map((r) => r.provider))];
const { error: delErr } = await sb.from("listings").delete().in("provider", providers).eq("city", CITY);
if (delErr) throw delErr;

const rows = DEMO_LISTINGS.map((r) => ({ ...r, city: CITY, is_demo: true }));
const { error } = await sb.from("listings").insert(rows);
if (error) throw error;

console.log(`Seeded ${rows.length} fictional listings for ${providers.join(", ")}.`);
