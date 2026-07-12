export const metadata = {
  title: "RideCompare — Compare self-drive car rental prices",
  description: "Compare live self-drive car rental prices across providers in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#f7f7f8", color: "#111" }}>
        {children}
      </body>
    </html>
  );
}
