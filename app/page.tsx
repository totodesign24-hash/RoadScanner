import { CATEGORIES, CITIES } from "../lib/supabase";
import { theme } from "../lib/theme";

export default function HomePage() {
  return (
    <>
      <header style={headerStyle}>
        <div style={headerInnerStyle}>
          <div style={logoStyle}>
            <span style={{ color: "#fff" }}>Ride</span>
            <span style={{ color: theme.teal }}>Compare</span>
          </div>
          <nav style={{ display: "flex", gap: 24, fontSize: ".9rem", color: "#dce6f5" }}>
            <span>Car Hire</span>
          </nav>
        </div>
      </header>

      <section style={heroStyle}>
        <div style={heroInnerStyle}>
          <h1 style={heroTitleStyle}>Compare self-drive car rental prices</h1>
          <p style={heroSubStyle}>
            One search across every provider — DriveDilSe, Zoomcar, Revv &amp; Myles
          </p>
        </div>
      </section>

      <main style={{ maxWidth: 900, margin: "-56px auto 80px", padding: "0 20px", position: "relative" }}>
        <form action="/results" method="get" style={searchCardStyle}>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>City</label>
            <select name="city" defaultValue={CITIES[0]} style={selectStyle}>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={{ ...fieldGroupStyle, borderLeft: `1px solid ${theme.border}` }}>
            <label style={labelStyle}>Car type</label>
            <select name="category" defaultValue={CATEGORIES[0]} style={selectStyle}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button type="submit" style={ctaButtonStyle}>Search prices</button>
        </form>

        <div style={trustRowStyle}>
          <div style={trustItemStyle}>🔄 Updated every few hours</div>
          <div style={trustItemStyle}>🏷️ Cheapest option highlighted</div>
          <div style={trustItemStyle}>🔗 Book directly with the provider</div>
        </div>
      </main>
    </>
  );
}

const headerStyle: React.CSSProperties = {
  background: theme.navy,
};

const headerInnerStyle: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "16px 20px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const logoStyle: React.CSSProperties = {
  fontSize: "1.3rem",
  fontWeight: 800,
  letterSpacing: "-0.5px",
};

const heroStyle: React.CSSProperties = {
  background: `linear-gradient(135deg, ${theme.navy} 0%, ${theme.blueDark} 55%, ${theme.blue} 100%)`,
  padding: "56px 20px 120px",
  textAlign: "center",
};

const heroInnerStyle: React.CSSProperties = {
  maxWidth: 700,
  margin: "0 auto",
};

const heroTitleStyle: React.CSSProperties = {
  color: "#fff",
  fontSize: "2.4rem",
  fontWeight: 800,
  margin: "0 0 12px",
  letterSpacing: "-0.5px",
};

const heroSubStyle: React.CSSProperties = {
  color: "#cfe0f7",
  fontSize: "1.05rem",
  margin: 0,
};

const searchCardStyle: React.CSSProperties = {
  background: theme.card,
  borderRadius: 16,
  boxShadow: "0 20px 40px rgba(10,31,68,0.18)",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "stretch",
  overflow: "hidden",
};

const fieldGroupStyle: React.CSSProperties = {
  flex: "1 1 200px",
  padding: "14px 20px",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const labelStyle: React.CSSProperties = {
  fontSize: ".72rem",
  fontWeight: 700,
  color: theme.textMuted,
  textTransform: "uppercase",
  letterSpacing: ".04em",
};

const selectStyle: React.CSSProperties = {
  border: "none",
  outline: "none",
  fontSize: "1rem",
  fontWeight: 600,
  color: theme.text,
  background: "transparent",
  padding: 0,
};

const ctaButtonStyle: React.CSSProperties = {
  flex: "0 0 auto",
  border: "none",
  background: theme.teal,
  color: "#fff",
  fontSize: "1.05rem",
  fontWeight: 700,
  padding: "0 40px",
  cursor: "pointer",
  minWidth: 180,
};

const trustRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: 28,
  flexWrap: "wrap",
  marginTop: 28,
};

const trustItemStyle: React.CSSProperties = {
  fontSize: ".85rem",
  color: theme.textMuted,
  fontWeight: 600,
};
