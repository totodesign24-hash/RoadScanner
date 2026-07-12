import { supabase, Listing, PROVIDER_LABELS, PROVIDER_LINKS } from "../../lib/supabase";

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: { city?: string; category?: string };
}) {
  const city = searchParams.city || "Pune";
  const category = searchParams.category || "Hatchback";

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("city", city)
    .eq("category", category)
    .order("price_per_day", { ascending: true });

  const listings = (data || []) as Listing[];
  const cheapest = listings[0];

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px" }}>
      <a href="/" style={{ color: "#555", fontSize: ".9rem" }}>&larr; New search</a>
      <h1 style={{ fontSize: "1.6rem", margin: "12px 0 4px" }}>
        {category} in {city}
      </h1>
      <p style={{ color: "#777", marginBottom: 24, fontSize: ".9rem" }}>
        {listings.length} provider{listings.length !== 1 ? "s" : ""} found
      </p>

      {error && (
        <p style={{ color: "#b42318" }}>Could not load prices right now — please try again shortly.</p>
      )}

      {!error && listings.length === 0 && (
        <p style={{ color: "#777" }}>
          No prices for this category/city yet — the scraper may not have run yet. Check back soon.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {listings.map((l) => (
          <a
            key={l.id}
            href={PROVIDER_LINKS[l.provider] || "#"}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 20px",
              background: "#fff",
              borderRadius: 12,
              border: l.id === cheapest?.id ? "2px solid #16a34a" : "1px solid #e5e5e5",
              textDecoration: "none",
              color: "#111",
            }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>
                {PROVIDER_LABELS[l.provider] || l.provider}
                {l.id === cheapest?.id && (
                  <span style={{ marginLeft: 8, fontSize: ".7rem", color: "#16a34a", fontWeight: 700 }}>
                    CHEAPEST
                  </span>
                )}
              </div>
              {l.car_name && <div style={{ fontSize: ".82rem", color: "#777" }}>{l.car_name}</div>}
              <div style={{ fontSize: ".75rem", color: "#aaa", marginTop: 4 }}>Updated {timeAgo(l.scraped_at)}</div>
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800 }}>₹{l.price_per_day}/day</div>
          </a>
        ))}
      </div>
    </main>
  );
}
