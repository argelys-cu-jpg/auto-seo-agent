import type { ReactNode } from "react";

export function Panel({
  title,
  children,
  variant = "default",
}: {
  title: string;
  children: ReactNode;
  variant?: "default" | "grid";
}) {
  const isGrid = variant === "grid";
  return (
    <section
      style={{
        background: isGrid ? "#ffffff" : "rgba(255,255,255,0.74)",
        border: isGrid ? "1px solid #e6eaf0" : "1px solid #e1d4bc",
        borderRadius: isGrid ? 12 : 18,
        padding: isGrid ? 14 : 18,
        boxShadow: isGrid ? "none" : "0 10px 30px rgba(0,0,0,0.05)",
      }}
    >
      <h2
        style={{
          marginTop: 0,
          marginBottom: 12,
          fontSize: isGrid ? 13 : 16,
          textTransform: isGrid ? "none" : "uppercase",
          letterSpacing: isGrid ? "0" : "0.06em",
          color: isGrid ? "#5f6b7a" : undefined,
          fontWeight: isGrid ? 700 : 800,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Badge({ children, variant = "default" }: { children: ReactNode; variant?: "default" | "grid" }) {
  const isGrid = variant === "grid";
  return (
    <span
      style={{
        display: "inline-flex",
        padding: isGrid ? "3px 8px" : "4px 10px",
        borderRadius: 999,
        background: isGrid ? "#eef3ff" : "#e4efe7",
        color: isGrid ? "#42526a" : "#234b38",
        fontSize: isGrid ? 11 : 12,
        fontWeight: isGrid ? 600 : 700,
        border: isGrid ? "1px solid #dbe4f4" : "none",
      }}
    >
      {children}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.74)",
        border: "1px solid #e1d4bc",
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#587161" }}>
        {label}
      </div>
      <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800 }}>{value}</div>
      {detail ? <div style={{ marginTop: 8, fontSize: 14, color: "#506156" }}>{detail}</div> : null}
    </div>
  );
}
