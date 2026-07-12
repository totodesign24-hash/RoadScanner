import { createClient } from "@supabase/supabase-js";

// Public anon client only -- `listings` is the only table exposed to it,
// and it's read-only (see supabase/migrations/0001_listings.sql). Never
// put a service-role key in this file; it ships to the browser bundle.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export type Listing = {
  id: string;
  provider: string;
  category: string;
  city: string;
  price_per_day: number;
  car_name: string | null;
  scraped_at: string;
};

export const CATEGORIES = ["Hatchback", "Sedan", "SUV", "MPV"] as const;
export const CITIES = ["Pune"] as const;

export const PROVIDER_LINKS: Record<string, string> = {
  drivedilse: "https://drivedilse.com/cars",
  zoomcar: "https://www.zoomcar.com/",
  revv: "https://www.revv.co.in/",
  myles: "https://myles.com/",
};

export const PROVIDER_LABELS: Record<string, string> = {
  drivedilse: "DriveDilSe",
  zoomcar: "Zoomcar",
  revv: "Revv",
  myles: "Myles",
};
