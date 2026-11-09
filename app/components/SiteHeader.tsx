"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";

const navigation = [
  { key: "home", href: "#home" },
  { key: "about", href: "#about" },
  { key: "projects", href: "#projects" },
  { key: "skills", href: "#skills" },
  { key: "contact", href: "#contact" },
] as const;

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const { locale, setLocale, translations } = useLanguage();

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
          aria-label={translations.nav.brandHomeAriaLabel}
          onClick={() => setMenuOpen(false)}
        >
          TDM <span>GLUZ</span>
          <i aria-hidden="true" />
        </a>
        <button
          type="button"
          className="menu-toggle"
          aria-label={
            menuOpen
              ? translations.nav.closeMenu
              : translations.nav.openMenu
          }
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
          aria-label={translations.nav.mainAriaLabel}
        >
          {navigation.map(({ key, href }) => {
            const sectionId = href.slice(1);
            return (
              <a
                className={`nav-link${sectionId === "contact" ? " nav-contact" : ""}${activeSection === sectionId ? " is-active" : ""}`}
                href={href}
                aria-current={activeSection === sectionId ? "location" : undefined}
                key={href}
                onClick={() => setMenuOpen(false)}
              >
                {translations.nav[key]}
                {sectionId === "contact" && <span aria-hidden="true">↗</span>}
              </a>
            );
          })}
          <div
            className="language-switcher"
            role="group"
            aria-label={translations.nav.languageSwitcherLabel}
          >
            <button
              type="button"
              className={locale === "en" ? "is-selected" : ""}
              aria-label={translations.nav.selectEnglish}
              aria-pressed={locale === "en"}
              onClick={() => setLocale("en")}
            >
              EN
            </button>
            <span aria-hidden="true">|</span>
            <button
              type="button"
              className={locale === "vi" ? "is-selected" : ""}
              aria-label={translations.nav.selectVietnamese}
              aria-pressed={locale === "vi"}
              onClick={() => setLocale("vi")}
            >
              VI
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
