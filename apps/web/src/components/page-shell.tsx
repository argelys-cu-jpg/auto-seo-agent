"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="airops-shell">
      <aside className="airops-rail">
        <div className="airops-rail-logo">×</div>
        <Link href="/grid" className="airops-rail-button" aria-label="Open grid">
          +
        </Link>
        <div className="airops-rail-spacer" />
        <Link href="/grid" className="airops-rail-button" aria-label="Grid">
          ⊞
        </Link>
        <Link href="/inbox" className="airops-rail-button" aria-label="Queues">
          ◴
        </Link>
        <Link href="/review" className="airops-rail-button" aria-label="Review">
          ✓
        </Link>
        <Link href="/monitoring" className="airops-rail-button" aria-label="Monitoring">
          ⚙
        </Link>
      </aside>
      <div className="airops-main">
        <header className="airops-topbar">
          <div className="airops-titlebar">
            <Link href="/" className="airops-back" aria-label="Back">
              ←
            </Link>
            <div className="airops-green-dot" />
            <div>
              <div className="airops-title">CookUnity SEO Ops</div>
              <div className="airops-subtitle">Operator workspace</div>
            </div>
          </div>
          <div className="airops-topbar-meta">Single app • review gated • Strapi-connected</div>
        </header>

        <nav className="airops-subnav">
          {nav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`airops-tab${isActive ? " is-active" : ""}`}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="airops-canvas">
          <div className="app-workspace">
            <header className="app-workspace-header">
              <div>
                <div className="app-kicker">CookUnity SEO agent</div>
                <h1 className="app-title">{title}</h1>
                {description ? <p className="app-description">{description}</p> : null}
              </div>
              {actions ? <div className="app-actions">{actions}</div> : null}
            </header>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
