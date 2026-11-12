"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";

const navigation = [
  { key: "home", sectionId: "home" },
  { key: "about", sectionId: "about" },
  { key: "projects", sectionId: "projects" },
  { key: "skills", sectionId: "skills" },
  { key: "contact", sectionId: "contact" },
] as const;

const languageOptions = [
  { locale: "ko", label: "KR", ariaLabelKey: "selectKorean" },
  { locale: "ja", label: "JP", ariaLabelKey: "selectJapanese" },
  { locale: "vi", label: "VI", ariaLabelKey: "selectVietnamese" },
  { locale: "en", label: "EN", ariaLabelKey: "selectEnglish" },
] as const;

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [observedSection, setObservedSection] = useState("home");
  const pathname = usePathname();
  const { locale, setLocale, translations } = useLanguage();
  const activeSection =
    pathname === "/about"
      ? "about"
      : pathname === "/"
        ? observedSection
        : "";

  useEffect(() => {
    if (pathname !== "/") {
      return;
    }

    const sections = navigation
      .map(({ sectionId }) => document.getElementById(sectionId))
      .filter((section): section is HTMLElement => section !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const activeId = visibleSections[0]?.target.id;

        if (activeId) {
          setObservedSection(activeId);
        }
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75] },
    );

    sections.forEach((section) => observer.observe(section));
    const hashTarget = window.location.hash.slice(1);
    const scrollFrame = hashTarget
      ? window.requestAnimationFrame(() => {
          document
            .getElementById(hashTarget)
            ?.scrollIntoView({ block: "start" });
        })
      : 0;

    return () => {
      observer.disconnect();
      if (scrollFrame) {
        window.cancelAnimationFrame(scrollFrame);
      }
    };
  }, [pathname]);

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
          href={pathname === "/" ? "#home" : "/#home"}
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
          {navigation.map(({ key, sectionId }) => {
            const href =
              key === "about"
                ? "/about"
                : pathname === "/"
                  ? `#${sectionId}`
                  : `/#${sectionId}`;

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
            {languageOptions.map(({ locale: optionLocale, label, ariaLabelKey }, index) => (
              <span className="language-option" key={optionLocale}>
                {index > 0 && <span aria-hidden="true">|</span>}
                <button
                  type="button"
                  className={locale === optionLocale ? "is-selected" : ""}
                  aria-label={translations.nav[ariaLabelKey]}
                  aria-pressed={locale === optionLocale}
                  onClick={() => setLocale(optionLocale)}
                >
                  {label}
                </button>
              </span>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
