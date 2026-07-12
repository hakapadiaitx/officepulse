"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "7rem", fontWeight: 800, color: "#e5e7eb", margin: 0, lineHeight: 1 }}>500</p>
          <p style={{ fontSize: "1.125rem", color: "#374151", margin: "1rem 0 1.5rem" }}>Something went wrong</p>
          <button onClick={reset} style={{ color: "#4f46e5", background: "none", border: "none", textDecoration: "underline", fontSize: "0.875rem", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
