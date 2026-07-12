import { CATEGORIES, CITIES } from "../lib/supabase";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "64px 20px" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: 8 }}>RideCompare</h1>
      <p style={{ color: "#555", marginBottom: 32 }}>
        Compare self-drive car rental prices across providers, updated every few hours.
      </p>
      <form action="/results" method="get" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <select name="city" defaultValue={CITIES[0]} style={selectStyle}>
          {CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select name="category" defaultValue={CATEGORIES[0]} style={selectStyle}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button type="submit" style={buttonStyle}>Compare prices</button>
      </form>
    </main>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #ddd",
  fontSize: "1rem",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: 8,
  border: "none",
  background: "#111",
  color: "#fff",
  fontSize: "1rem",
  cursor: "pointer",
};
