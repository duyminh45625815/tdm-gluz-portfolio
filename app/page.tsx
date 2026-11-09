"use client";

import { useLanguage } from "./components/LanguageProvider";
import SiteHeader from "./components/SiteHeader";

const currentYear = new Date().getFullYear();

const skillIcons = [
  <svg key="requirements" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 6h12M8 12h12M8 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
  </svg>,
  <svg key="process" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="4" width="7" height="6" rx="1" />
    <rect x="14" y="14" width="7" height="6" rx="1" />
    <path d="M10 7h3a2 2 0 0 1 2 2v5" />
  </svg>,
  <svg key="data" viewBox="0 0 24 24" aria-hidden="true">
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v7c0 1.66 3.58 3 8 3m8-10v7c0 1.66-3.58 3-8 3M4 12v7c0 1.66 3.58 3 8 3" />
    <path d="M20 12v7c0 1.66-3.58 3-8 3" />
  </svg>,
  <svg key="design" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3 3 8l9 5 9-5-9-5Z" />
    <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
  </svg>,
];

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4.5 10h10m-4-4 4 4-4 4" />
    </svg>
  );
}

function ProjectArtwork({
  index,
  caption,
}: {
  index: number;
  caption: string;
}) {
  if (index === 0) {
    return (
      <div className="project-art project-art-cinema" aria-hidden="true">
        <div className="art-orbit art-orbit-one" />
        <div className="art-orbit art-orbit-two" />
        <div className="art-screen">
          <span className="art-screen-top" />
          <span className="art-screen-line" />
          <span className="art-screen-line art-screen-line-short" />
          <span className="art-screen-button" />
        </div>
        <span className="art-caption">{caption}</span>
      </div>
    );
  }

  return (
    <div className="project-art project-art-gym" aria-hidden="true">
      <div className="gym-grid">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="gym-ring gym-ring-outer">
        <div className="gym-ring gym-ring-inner">
          <span className="gym-center">GYM</span>
        </div>
      </div>
      <span className="art-caption">{caption}</span>
    </div>
  );
}

export default function Home() {
  const { translations: t } = useLanguage();

  return (
    <>
      <a className="skip-link" href="#main-content">
        {t.skipToContent}
      </a>
      <SiteHeader />

      <main id="main-content">
        <section
          id="home"
          aria-labelledby="hero-heading"
          className="hero-section scroll-mt-24"
        >
          <div className="page-shell hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">
                <span className="status-dot" />
                {t.hero.welcome}
              </p>
              <h1 id="hero-heading">
                {t.hero.intro} <span className="gradient-text">GLUZ.</span>
              </h1>
              <p className="hero-role">{t.hero.role}</p>
              <p className="hero-statement">{t.hero.statement}</p>
              <p className="hero-description">{t.hero.description}</p>
              <div className="hero-actions">
                <a className="button button-primary" href="#projects">
                  {t.hero.projectsButton} <ArrowIcon />
                </a>
                <a className="button button-secondary" href="#about">
                  {t.hero.aboutButton}
                </a>
              </div>
              <p className="hero-footnote">{t.hero.footnote}</p>
            </div>

            <div className="hero-visual" aria-label={t.hero.visualLabel}>
              <div className="visual-glow" />
              <div className="visual-grid" />
              <div className="visual-orbit visual-orbit-a" />
              <div className="visual-orbit visual-orbit-b" />
              <div className="visual-cross visual-cross-a" />
              <div className="visual-cross visual-cross-b" />
              <div className="visual-monogram">
                <span className="monogram-kicker">{t.hero.visualKicker}</span>
                <span className="monogram-name">{t.hero.visualName}</span>
                <span className="monogram-rule" />
                <span className="monogram-caption">
                  {t.hero.visualCaptionFirst}
                  <br />
                  {t.hero.visualCaptionSecond}
                </span>
              </div>
              <span className="visual-coordinate">{t.hero.visualCoordinate}</span>
              <span className="visual-index">{t.hero.visualIndex}</span>
            </div>
          </div>
          <div className="hero-bottom-line page-shell">
            <span>{t.hero.bottomLineFirst}</span>
            <span>{t.hero.bottomLineSecond}</span>
          </div>
        </section>

        <section
          className="highlights-section"
          aria-label={t.highlights.ariaLabel}
        >
          <div className="page-shell highlights-row">
            {t.highlights.items.map((highlight, index) => (
              <div className="highlight-item" key={highlight}>
                <span className="highlight-index">0{index + 1}</span>
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        </section>

        <section
          id="about"
          aria-labelledby="about-heading"
          className="content-section about-section scroll-mt-24"
        >
          <div className="page-shell about-grid">
            <div className="section-marker">
              <span className="marker-line" />
              <span>{t.about.sectionLabel}</span>
            </div>
            <div className="about-content">
              <h2 id="about-heading">
                {t.about.headingFirst}
                <br />
                <span className="text-muted">{t.about.headingSecond}</span>
              </h2>
              <p>{t.about.description}</p>
              <a className="text-link" href="#skills">
                {t.about.moreLink} <ArrowIcon />
              </a>
            </div>
            <div className="about-aside" aria-hidden="true">
              <span className="aside-symbol">↗</span>
              <span>{t.about.asideFirst}</span>
              <span className="aside-rule" />
              <span>{t.about.asideSecond}</span>
            </div>
          </div>
        </section>

        <section
          id="projects"
          aria-labelledby="projects-heading"
          className="content-section projects-section scroll-mt-24"
        >
          <div className="page-shell">
            <div className="section-heading-row">
              <div>
                <div className="section-marker">
                  <span className="marker-line" />
                  <span>{t.projects.sectionLabel}</span>
                </div>
                <h2 id="projects-heading">{t.projects.heading}</h2>
              </div>
              <p className="section-intro">{t.projects.intro}</p>
            </div>
            <div className="project-list">
              {t.projects.items.map((project, index) => (
                <article
                  className="project-card"
                  id={`project-${project.slug}`}
                  key={project.slug}
                >
                  <ProjectArtwork
                    index={index}
                    caption={
                      index === 0
                        ? t.projects.cinemaArtwork
                        : t.projects.gymArtwork
                    }
                  />
                  <div className="project-content">
                    <div className="project-meta">
                      <span className="category-badge">
                        {t.projects.category}
                      </span>
                      <span className="academic-label">
                        {t.projects.academicLabel}
                      </span>
                    </div>
                    <h3>{project.title}</h3>
                    {project.subtitle.length > 0 && (
                      <p className="project-subtitle">{project.subtitle}</p>
                    )}
                    <p className="project-description">
                      {project.description}
                    </p>
                    <div
                      className="deliverables"
                      id={`deliverables-${project.slug}`}
                    >
                      <span className="deliverables-label">
                        {t.projects.deliverablesLabel}
                      </span>
                      <ul>
                        {project.deliverables.map((deliverable) => (
                          <li key={deliverable}>{deliverable}</li>
                        ))}
                      </ul>
                    </div>
                    <a
                      className="text-link project-link"
                      href={`#deliverables-${project.slug}`}
                      aria-label={t.projects.viewProjectAriaLabel.replace(
                        "{title}",
                        project.title,
                      )}
                    >
                      {t.projects.viewProject} <ArrowIcon />
                    </a>
                  </div>
                  <span className="project-number" aria-hidden="true">
                    0{index + 1}
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="skills"
          aria-labelledby="skills-heading"
          className="content-section skills-section scroll-mt-24"
        >
          <div className="page-shell">
            <div className="section-marker">
              <span className="marker-line" />
              <span>{t.skills.sectionLabel}</span>
            </div>
            <div className="section-heading-row skills-heading-row">
              <h2 id="skills-heading">{t.skills.heading}</h2>
              <p className="section-intro">{t.skills.intro}</p>
            </div>
            <div className="skills-grid">
              {t.skills.groups.map((group, index) => (
                <article className="skill-card" key={group.title}>
                  <div className="skill-card-top">
                    <span className="skill-icon">{skillIcons[index]}</span>
                    <span className="skill-card-index">0{index + 1}</span>
                  </div>
                  <h3>{group.title}</h3>
                  <ul>
                    {group.items.map((skill) => (
                      <li key={skill}>{skill}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="contact"
          aria-labelledby="contact-heading"
          className="contact-section scroll-mt-24"
        >
          <div className="page-shell contact-inner">
            <div>
              <div className="section-marker section-marker-light">
                <span className="marker-line" />
                <span>{t.contact.sectionLabel}</span>
              </div>
              <h2 id="contact-heading">{t.contact.heading}</h2>
              <p>{t.contact.description}</p>
            </div>
            <div
              className="contact-actions"
              aria-label={t.contact.linksAriaLabel}
            >
              <a className="button button-contact" href="mailto:EMAIL_HERE">
                {t.contact.email} <ArrowIcon />
              </a>
              <a
                className="button button-contact-quiet"
                href="LINKEDIN_HERE"
                target="_blank"
                rel="noreferrer"
              >
                {t.contact.linkedin} <ArrowIcon />
              </a>
              <a
                className="button button-contact-quiet"
                href="GITHUB_HERE"
                target="_blank"
                rel="noreferrer"
              >
                {t.contact.github} <ArrowIcon />
              </a>
            </div>
            <div className="contact-orb" aria-hidden="true" />
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="page-shell footer-inner">
          <a
            className="footer-brand"
            href="#home"
            aria-label={t.footer.brandHomeAriaLabel}
          >
            TDM <span>GLUZ</span>
            <i aria-hidden="true" />
          </a>
          <p>{t.footer.motto}</p>
          <div className="footer-meta">
            <span>© {currentYear} TDM GLUZ</span>
            <a href="#home">
              {t.footer.backToTop} <span aria-hidden="true">↑</span>
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
