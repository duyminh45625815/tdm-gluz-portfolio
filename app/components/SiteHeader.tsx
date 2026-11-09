"use client";

import { useEffect, useState } from "react";

const navigation = [
  { label: "Home", href: "#home" },
  { label: "About Me", href: "#about" },
  { label: "Project", href: "#projects" },
  { label: "Skill", href: "#skills" },
  { label: "Contact", href: "#contact" },
];

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    const sections = navigation
      .map(({ href }) => document.querySelector(href))
      .filter((section): section is Element => section !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const activeId = visibleSections[0]?.target.id;

        if (activeId) {
          setActiveSection(activeId);
        }
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <header className="site-header">
      <div className="page-shell header-inner">
        <a
          className="brand"
          href="#home"
          aria-label="TDM GLUZ, home"
          onClick={() => setMenuOpen(false)}
        >
          TDM <span>GLUZ</span>
          <i aria-hidden="true" />
        </a>
        <button
          type="button"
          className="menu-toggle"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-controls="primary-navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>
        <nav
          id="primary-navigation"
          className={`primary-navigation${menuOpen ? " is-open" : ""}`}
          aria-label="Main navigation"
        >
          {navigation.map(({ label, href }) => {
            const sectionId = href.slice(1);
            return (
              <a
                className={`nav-link${sectionId === "contact" ? " nav-contact" : ""}${activeSection === sectionId ? " is-active" : ""}`}
                href={href}
                aria-current={activeSection === sectionId ? "location" : undefined}
                key={href}
                onClick={() => setMenuOpen(false)}
              >
                {label}
                {sectionId === "contact" && <span aria-hidden="true">↗</span>}
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
