"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { AdminPublic } from "@/lib/auth/server";
import LogoutButton from "./LogoutButton";

const navigation = [
  { href: "/admin", label: "Dashboard", icon: "D" },
  { href: "/admin/settings", label: "Site Settings", icon: "S" },
  { href: "/admin/home", label: "Home Page", icon: "H" },
  { href: "/admin/about", label: "About Page", icon: "A" },
  { href: "/admin/projects", label: "Projects", icon: "P" },
  { href: "/admin/skill-groups", label: "Skill Groups", icon: "S" },
  { href: "/admin/education", label: "Education", icon: "E" },
] as const;

function isActiveRoute(pathname: string, href: string): boolean {
  return href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminShell({
  admin,
  expiresAt,
  children,
}: {
  admin: AdminPublic;
  expiresAt: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentPage =
    navigation.find((item) => isActiveRoute(pathname, item.href))?.label ??
    "Dashboard";

  useEffect(() => {
    function handleExpiredSession() {
      router.replace("/admin/login?expired=1");
    }

    window.addEventListener("admin-session-expired", handleExpiredSession);
    return () =>
      window.removeEventListener("admin-session-expired", handleExpiredSession);
  }, [router]);

  return (
    <div
      className={`admin-shell${collapsed ? " is-collapsed" : ""}${mobileOpen ? " is-mobile-open" : ""}`}
    >
      <button
        className="admin-nav-backdrop"
        type="button"
        aria-label="Close navigation"
        onClick={() => setMobileOpen(false)}
      />
      <aside className="admin-sidebar">
        <Link className="admin-sidebar-brand" href="/admin">
          <span className="admin-sidebar-brand-mark">T</span>
          <span className="admin-sidebar-brand-text">
            TDM GLUZ<span>.</span>
          </span>
        </Link>
        <p className="admin-sidebar-caption">Portfolio CMS</p>
        <nav
          id="admin-navigation"
          className="admin-sidebar-nav"
          aria-label="Admin navigation"
        >
          {navigation.map((item) => {
            const active = isActiveRoute(pathname, item.href);
            return (
              <Link
                key={item.href}
                className={`admin-sidebar-link${active ? " is-active" : ""}`}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <span className="admin-nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="admin-nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="admin-sidebar-footer">
          <span>Signed in as</span>
          <strong title={admin.email}>{admin.email}</strong>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <div className="admin-header-start">
            <button
              className="admin-collapse-toggle"
              type="button"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-pressed={collapsed}
              onClick={() => setCollapsed((value) => !value)}
            >
              <span aria-hidden="true">{collapsed ? "»" : "«"}</span>
            </button>
            <button
              className="admin-mobile-toggle"
              type="button"
              aria-expanded={mobileOpen}
              aria-controls="admin-navigation"
              onClick={() => setMobileOpen((value) => !value)}
            >
              <span aria-hidden="true">{mobileOpen ? "×" : "☰"}</span>
              <span className="sr-only">
                {mobileOpen ? "Close navigation" : "Open navigation"}
              </span>
            </button>
            <div className="admin-header-title">
              <span>Admin</span>
              <h1>{currentPage}</h1>
            </div>
          </div>
          <div className="admin-account">
            <div>
              <span>{admin.email}</span>
              <small>{admin.role}</small>
            </div>
            <LogoutButton expiresAt={expiresAt} />
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
