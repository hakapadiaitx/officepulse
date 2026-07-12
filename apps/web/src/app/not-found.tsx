export default function NotFound() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: "7rem", fontWeight: 800, color: "#e5e7eb", margin: 0, lineHeight: 1 }}>404</p>
        <p style={{ fontSize: "1.125rem", color: "#374151", margin: "1rem 0 1.5rem" }}>Page not found</p>
        <a href="/" style={{ color: "#4f46e5", textDecoration: "underline", fontSize: "0.875rem" }}>Go home</a>
      </div>
    </div>
  );
}
