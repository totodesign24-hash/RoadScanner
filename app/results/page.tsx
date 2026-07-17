import { supabase, Listing, PROVIDER_LABELS, PROVIDER_LINKS, CATEGORIES } from "../../lib/supabase";
import { theme } from "../../lib/theme";

// Next.js patches global fetch (which supabase-js uses under the hood) to
// cache indefinitely by default in Server Components. Prices change every
// scraper run, so that cache must be disabled -- otherwise this page keeps
// serving whatever it first fetched (including an empty result from before
// `listings` had any rows) forever.
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const providers = [...new Set(listings.map((l) => l.provider))];
  const latestUpdate = listings.reduce<string | null>(
    (max, l) => (!max || l.scraped_at > max ? l.scraped_at : max),
    null,
  );

  return (
    <>
      <header style={headerStyle}>
        <div style={headerInnerStyle}>
          <a href="/" style={logoStyle}>
            <span style={{ color: "#fff" }}>Ride</span>
            <span style={{ color: theme.teal }}>Compare</span>
          </a>
        </div>
      </header>

      <div style={searchBarWrapStyle}>
        <form action="/results" method="get" style={searchBarStyle}>
          <select name="city" defaultValue={city} style={miniSelectStyle}>
            <option value={city}>{city}</option>
          </select>
          <span style={dividerStyle} />
          <select name="category" defaultValue={category} style={miniSelectStyle}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button type="submit" style={miniCtaStyle}>Search</button>
        </form>
      </div>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 20px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <h1 style={{ fontSize: "1.4rem", margin: 0, color: theme.text }}>
            {category} rentals in {city}
          </h1>
          <span style={{ fontSize: ".82rem", color: theme.textMuted }}>
            {listings.length} result{listings.length !== 1 ? "s" : ""}
            {latestUpdate ? ` · updated ${timeAgo(latestUpdate)}` : ""}
          </span>
        </div>

        {error && <p style={{ color: "#c0152f" }}>Could not load prices right now — please try again shortly.</p>}

        {!error && listings.length === 0 && (
          <div style={emptyStateStyle}>
            No prices for this category/city yet — the scraper may not have run yet. Check back soon.
          </div>
        )}

        {listings.some((l) => l.is_demo) && (
          <div style={demoNoticeStyle}>
            Rows marked <strong>ESTIMATED</strong> are placeholder figures, not live scraped prices — that provider's scraper isn't wired up yet.
          </div>
        )}

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          <aside style={sidebarStyle}>
            <div style={sidebarTitleStyle}>Providers included</div>
            {providers.map((p) => (
              <div key={p} style={sidebarItemStyle}>
                <span style={sidebarDotStyle} />
                {PROVIDER_LABELS[p] || p}
              </div>
            ))}
            {providers.length === 0 && <div style={{ fontSize: ".8rem", color: theme.textMuted }}>No results yet</div>}
          </aside>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            {listings.map((l) => (
              <a
                key={l.id}
                href={PROVIDER_LINKS[l.provider] || "#"}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...resultCardStyle,
                  border: l.id === cheapest?.id ? `2px solid ${theme.teal}` : `1px solid ${theme.border}`,
                }}
              >
                <div style={providerBadgeStyle}>{(PROVIDER_LABELS[l.provider] || l.provider)[0]}</div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 700, color: theme.text }}>{PROVIDER_LABELS[l.provider] || l.provider}</span>
                    {l.id === cheapest?.id && <span style={cheapestBadgeStyle}>CHEAPEST</span>}
                    {l.is_demo && <span style={demoBadgeStyle}>ESTIMATED</span>}
                  </div>
                  {l.car_name && <div style={{ fontSize: ".82rem", color: theme.textMuted, marginTop: 2 }}>{l.car_name}</div>}
                  <div style={{ fontSize: ".72rem", color: "#a4afc1", marginTop: 4 }}>Updated {timeAgo(l.scraped_at)}</div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "1.4rem", fontWeight: 800, color: theme.text }}>₹{l.price_per_day}</div>
                  <div style={{ fontSize: ".72rem", color: theme.textMuted }}>per day</div>
                  <div style={selectBtnStyle}>Select</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

const headerStyle: React.CSSProperties = { background: theme.navy };
const headerInnerStyle: React.CSSProperties = { maxWidth: 1000, margin: "0 auto", padding: "14px 20px" };
const logoStyle: React.CSSProperties = { fontSize: "1.15rem", fontWeight: 800, textDecoration: "none" };

const searchBarWrapStyle: React.CSSProperties = { background: theme.blueDark, padding: "16px 20px" };
const searchBarStyle: React.CSSProperties = {
  maxWidth: 1000,
  margin: "0 auto",
  background: theme.card,
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
  overflow: "hidden",
  boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
};
const miniSelectStyle: React.CSSProperties = {
  border: "none",
  outline: "none",
  padding: "12px 16px",
  fontWeight: 600,
  fontSize: ".92rem",
  color: theme.text,
  background: "transparent",
};
const dividerStyle: React.CSSProperties = { width: 1, alignSelf: "stretch", background: theme.border };
const miniCtaStyle: React.CSSProperties = {
  marginLeft: "auto",
  border: "none",
  background: theme.teal,
  color: "#fff",
  fontWeight: 700,
  padding: "12px 28px",
  cursor: "pointer",
  fontSize: ".92rem",
};

const sidebarStyle: React.CSSProperties = {
  width: 200,
  flexShrink: 0,
  background: theme.card,
  border: `1px solid ${theme.border}`,
  borderRadius: 12,
  padding: 16,
};

const sidebarTitleStyle: React.CSSProperties = { fontWeight: 700, fontSize: ".85rem", marginBottom: 10, color: theme.text };
const sidebarItemStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: ".85rem", color: theme.textMuted, marginBottom: 8 };
const sidebarDotStyle: React.CSSProperties = { width: 8, height: 8, borderRadius: "50%", background: theme.teal, flexShrink: 0 };

const resultCardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  background: theme.card,
  borderRadius: 12,
  padding: "16px 20px",
  textDecoration: "none",
  boxShadow: "0 1px 3px rgba(10,31,68,0.06)",
};

const providerBadgeStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  background: theme.bg,
  color: theme.blue,
  fontWeight: 800,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const cheapestBadgeStyle: React.CSSProperties = {
  fontSize: ".65rem",
  fontWeight: 800,
  color: theme.tealDark,
  background: "#e3faf6",
  padding: "2px 8px",
  borderRadius: 20,
  letterSpacing: ".03em",
};

const demoBadgeStyle: React.CSSProperties = {
  fontSize: ".65rem",
  fontWeight: 800,
  color: "#946200",
  background: "#fff3d6",
  padding: "2px 8px",
  borderRadius: 20,
  letterSpacing: ".03em",
};

const selectBtnStyle: React.CSSProperties = {
  marginTop: 6,
  fontSize: ".78rem",
  fontWeight: 700,
  color: theme.blue,
};

const emptyStateStyle: React.CSSProperties = {
  background: theme.card,
  border: `1px solid ${theme.border}`,
  borderRadius: 12,
  padding: 32,
  textAlign: "center",
  color: theme.textMuted,
};

const demoNoticeStyle: React.CSSProperties = {
  background: "#fff8e8",
  border: "1px solid #f5deA0",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: ".8rem",
  color: "#8a6100",
  marginBottom: 16,
};
