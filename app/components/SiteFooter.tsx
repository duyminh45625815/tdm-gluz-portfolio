"use client";

import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";

const currentYear = new Date().getFullYear();

export default function SiteFooter() {
  const pathname = usePathname();
  const { translations: t } = useLanguage();
  const homeHref = pathname === "/" ? "#home" : "/#home";

  return (
    <footer className="site-footer">
      <div className="page-shell footer-inner">
        <a className="footer-brand" href={homeHref} aria-label={t.footer.brandHomeAriaLabel}>
          TDM <span>GLUZ</span>
          <i aria-hidden="true" />
        </a>
        <p>{t.footer.motto}</p>
        <div className="footer-meta">
          <span>© {currentYear} TDM GLUZ</span>
          <a href={homeHref}>
            {t.footer.backToTop} <span aria-hidden="true">↑</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
