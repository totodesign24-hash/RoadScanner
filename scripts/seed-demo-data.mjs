// Seeds clearly-fictional placeholder listings for Revv only.
//
// Myles is deliberately NOT seeded here: their real site (mylescars.com --
// myles.com is a dead/wrong domain, redirects to unrelated infra) lists
// Pune under "Subscription Cities" but NOT under "Self-drive cities"
// (Delhi, Mumbai, Bengaluru, Amritsar, Chandigarh, Goa, Vellore). Myles
// genuinely does not offer self-drive rental in Pune -- inventing prices
// for a service that doesn't exist there would be more misleading than
// having no data, so Myles is simply absent from Pune results until/unless
// that changes.
//
// Revv's real per-city listing URL wasn't found in the time available
// (revv.co.in/self-drive-cars/pune 404s; their homepage links to a "Car
// Rental in Pune" page via client-side routing that wasn't successfully
// traced) -- unlike Myles, there's no evidence Revv excludes Pune, so it's
// still marked is_demo=true pending someone finding the real URL, rather
// than dropped like Myles.
//
// Prices are hand-picked to sit in the same plausible range as the real
// Zoomcar/DriveDilSe data already in `listings` (roughly ₹1500-4000/day
// for hatchbacks/MPVs, ₹2500-9000 for SUVs) -- not randomly generated.
import { createClient } from "@supabase/supabase-js";

const CITY = "Pune";

const DEMO_LISTINGS = [
  // Revv -- fictional, pending real URL discovery
  { provider: "revv", category: "Hatchback", price_per_day: 1750, car_name: "Maruti Swift (demo)" },
  { provider: "revv", category: "Hatchback", price_per_day: 1980, car_name: "Hyundai Grand i10 (demo)" },
  { provider: "revv", category: "Sedan", price_per_day: 2600, car_name: "Honda City (demo)" },
  { provider: "revv", category: "SUV", price_per_day: 3400, car_name: "Hyundai Creta (demo)" },
  { provider: "revv", category: "SUV", price_per_day: 4100, car_name: "Mahindra XUV500 (demo)" },
  { provider: "revv", category: "MPV", price_per_day: 3050, car_name: "Maruti Ertiga (demo)" },
];

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Also removes any previously-seeded Myles rows -- see comment above on
// why Myles is no longer seeded for Pune.
const providers = [...new Set(DEMO_LISTINGS.map((r) => r.provider)), "myles"];
const { error: delErr } = await sb.from("listings").delete().in("provider", providers).eq("city", CITY);
if (delErr) throw delErr;

const rows = DEMO_LISTINGS.map((r) => ({ ...r, city: CITY, is_demo: true }));
const { error } = await sb.from("listings").insert(rows);
if (error) throw error;

console.log(`Seeded ${rows.length} fictional listings for ${providers.join(", ")}.`);
