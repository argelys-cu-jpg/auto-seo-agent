import Link from "next/link";
import type { ReactNode } from "react";

const nav = [
  { href: "/", label: "Overview" },
  { href: "/inbox", label: "Operational Inbox" },
  { href: "/grid", label: "Workflow Grid" },
  { href: "/agents", label: "Agent Control" },
  { href: "/cropper", label: "Image Cropper" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/review", label: "Review Queue" },
  { href: "/published", label: "Published" },
  { href: "/monitoring", label: "Monitoring" },
  { href: "/recommendations", label: "Refresh Tasks" },
];

export function PageShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "#f4efe7", color: "#16241a" }}>
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "24px 18px 56px",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#2f5d48" }}>
              CookUnity SEO Agent
            </div>
            <h1 style={{ margin: "6px 0 0", fontSize: 34, lineHeight: 1 }}>{title}</h1>
          </div>
          <nav style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "10px 14px",
                  borderRadius: 999,
                  background: "#fffaf2",
                  border: "1px solid #d8c8aa",
                  color: "#16241a",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
