"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/grid", label: "Pipeline", icon: "P" },
  { href: "/review", label: "Review", icon: "R" },
  { href: "/published", label: "Published", icon: "D" },
  { href: "/monitoring", label: "Monitor", icon: "M" },
];

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
  const [railExpanded, setRailExpanded] = useState(true);
  const [command, setCommand] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "\\") {
        event.preventDefault();
        setRailExpanded((current) => !current);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className={`airops-shell${railExpanded ? " is-rail-expanded" : ""}`}>
      <aside className="airops-rail" aria-label="Primary navigation">
        <div className="airops-rail-brand">
          <Link href="/" className="airops-rail-mark" aria-label="CookUnity Growth workbench">
            C
          </Link>
          <div className="airops-rail-brand-copy">
            <div className="airops-rail-title">Growth workbench</div>
            <div className="airops-rail-subtitle">CookUnity</div>
          </div>
        </div>

        <button
          type="button"
          className="airops-rail-toggle"
          onClick={() => setRailExpanded((current) => !current)}
          aria-expanded={railExpanded}
        >
          <span className="airops-rail-icon">⌘\</span>
          <span className="airops-rail-label">Collapse rail</span>
        </button>

        <nav className="airops-rail-nav">
          {navItems.map((item) => {
            const isActive = isActiveRoute(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`airops-rail-link${isActive ? " is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
                title={item.label}
              >
                <span className="airops-rail-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="airops-rail-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="airops-rail-spacer" />

        <Link href="/agents" className={`airops-rail-link${isActiveRoute(pathname, "/agents") ? " is-active" : ""}`} title="Settings">
          <span className="airops-rail-icon" aria-hidden="true">
            S
          </span>
          <span className="airops-rail-label">Settings</span>
        </Link>

        <div className="airops-user" title="User">
          <span className="airops-user-avatar" aria-hidden="true">
            A
          </span>
          <span className="airops-rail-label">Argelys</span>
        </div>
      </aside>

      <div className="airops-main">
        <header className="airops-commandbar">
          <label className="airops-command" aria-label="Global command search">
            <span className="airops-command-glyph" aria-hidden="true">
              /
            </span>
            <input
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="Search keywords, pages, drafts, or ask what to work on next"
            />
          </label>
        </header>

        <main className="airops-canvas">
          <div className="app-workspace">
            <header className="app-workspace-header">
              <div className="app-workspace-heading">
                <h1 className="app-title">{title}</h1>
                {description ? <p className="app-description">{description}</p> : null}
              </div>
              {actions ? <div className="app-actions">{actions}</div> : null}
            </header>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
