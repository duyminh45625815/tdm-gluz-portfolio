"use client";

import Link from "next/link";
import { useLanguage } from "./LanguageProvider";
import ProfilePortrait from "./ProfilePortrait";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

const areaIcons = [
  <svg key="requirements" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 6h12M8 12h12M8 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
  </svg>,
  <svg key="modeling" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="4" width="7" height="6" rx="1" />
    <rect x="14" y="14" width="7" height="6" rx="1" />
    <path d="M10 7h3a2 2 0 0 1 2 2v5" />
  </svg>,
  <svg key="documentation" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 3.75h8l4 4V20a.25.25 0 0 1-.25.25H6a.25.25 0 0 1-.25-.25V4A.25.25 0 0 1 6 3.75Z" />
    <path d="M14 4v4h4M8 12h8M8 16h8" />
  </svg>,
  <svg key="wireframing" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 9v11m4-7h5m-5 3h5" />
  </svg>,
  <svg key="communication" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 5.75A1.75 1.75 0 0 1 5.75 4h12.5A1.75 1.75 0 0 1 20 5.75v8.5A1.75 1.75 0 0 1 18.25 16H11l-5 4v-4h-.25A1.75 1.75 0 0 1 4 14.25Z" />
    <path d="M8 9h8m-8 3h5" />
  </svg>,
  <svg key="testing" viewBox="0 0 24 24" aria-hidden="true">
    <path d="m5 12 4 4L19 6" />
    <circle cx="12" cy="12" r="9" />
  </svg>,
];

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4.5 10h10m-4-4 4 4-4 4" />
    </svg>
  );
}

export default function AboutPage() {
  const { translations: t } = useLanguage();
  const about = t.aboutPage;

  return (
    <>
      <a className="skip-link" href="#main-content">
        {t.skipToContent}
      </a>
      <SiteHeader />

      <main id="main-content" className="about-page">
        <section className="about-page-hero" aria-labelledby="about-page-heading">
          <div className="page-shell about-page-hero-grid">
            <div className="about-page-intro">
              <p className="eyebrow">
                <span className="status-dot" />
                {about.hero.eyebrow}
              </p>
              <h1 id="about-page-heading">{about.hero.heading}</h1>
              <p className="about-page-role">{about.hero.role}</p>
              <p className="about-page-lead">{about.hero.intro}</p>
              <div className="about-page-facts">
                <span>{about.hero.location}</span>
                <span>{about.hero.focus}</span>
              </div>
            </div>
            <div className="about-portrait-wrap">
              <ProfilePortrait
                label={about.hero.portraitLabel}
                placeholder={about.hero.portraitPlaceholder}
                caption={about.hero.portraitCaption}
              />
            </div>
          </div>
          <div className="page-shell about-page-index" aria-hidden="true">
            <span>ABOUT / TDM</span>
            <span>01 — 08</span>
          </div>
        </section>

        <section className="about-story-section" aria-labelledby="about-story-heading">
          <div className="page-shell about-story-layout">
            <div className="section-marker">
              <span className="marker-line" />
              <span>{about.story.label}</span>
            </div>
            <div className="about-story-copy">
              <h2 id="about-story-heading">{about.story.heading}</h2>
              {about.story.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <aside className="about-story-aside">
              <span className="about-aside-label">{about.story.asideLabel}</span>
              <span className="about-aside-quote">“{about.story.asideQuote}”</span>
              <span className="about-aside-mark" aria-hidden="true">
                TDM
              </span>
            </aside>
          </div>
        </section>

        <section className="about-education-section" aria-labelledby="about-education-heading">
          <div className="page-shell">
            <div className="about-section-heading">
              <div className="section-marker">
                <span className="marker-line" />
                <span>{about.education.label}</span>
              </div>
              <h2 id="about-education-heading">{about.education.heading}</h2>
            </div>
            <article className="education-feature">
              <div className="education-monogram" aria-hidden="true">
                HU
              </div>
              <div className="education-details">
                <span className="education-status">{about.education.status}</span>
                <h3>{about.education.shortInstitution}</h3>
                <p className="education-institution">{about.education.institution}</p>
                <p className="education-degree">
                  {about.education.degree}
                  <span aria-hidden="true"> / </span>
                  {about.education.major}
                </p>
              </div>
              <span className="education-index" aria-hidden="true">
                01
              </span>
            </article>
          </div>
        </section>

        <section className="about-areas-section" aria-labelledby="about-areas-heading">
          <div className="page-shell">
            <div className="about-section-heading about-areas-heading">
              <div>
                <div className="section-marker">
                  <span className="marker-line" />
                  <span>{about.areas.label}</span>
                </div>
                <h2 id="about-areas-heading">{about.areas.heading}</h2>
              </div>
              <p>{about.areas.intro}</p>
            </div>
            <div className="about-areas-grid">
              {about.areas.items.map((item, index) => (
                <article className="about-area-item" key={item.title}>
                  <div className="about-area-top">
                    <span className="about-area-icon">{areaIcons[index]}</span>
                    <span className="about-area-number">0{index + 1}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="about-knowledge-section" aria-labelledby="about-knowledge-heading">
          <div className="page-shell about-knowledge-layout">
            <div className="about-knowledge-intro">
              <div className="section-marker">
                <span className="marker-line" />
                <span>{about.knowledge.label}</span>
              </div>
              <h2 id="about-knowledge-heading">{about.knowledge.heading}</h2>
            </div>
            <div className="about-knowledge-groups">
              {about.knowledge.groups.map((group, index) => (
                <div className="about-knowledge-group" key={group.title}>
                  <span className="about-knowledge-number">0{index + 1}</span>
                  <h3>{group.title}</h3>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="about-projects-section" aria-labelledby="about-projects-heading">
          <div className="page-shell">
            <div className="about-section-heading about-projects-heading">
              <div>
                <div className="section-marker">
                  <span className="marker-line" />
                  <span>{about.projects.label}</span>
                </div>
                <h2 id="about-projects-heading">{about.projects.heading}</h2>
              </div>
              <p>{about.projects.intro}</p>
            </div>
            <div className="about-project-list">
              {about.projects.items.map((project, index) => (
                <article className="about-project-item" key={project.title}>
                  <div className={`about-project-art about-project-art-${index + 1}`} aria-hidden="true">
                    <span>{index === 0 ? "CV+" : "GYM"}</span>
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="about-project-copy">
                    <span className="academic-label">{about.projects.academicLabel}</span>
                    <h3>{project.title}</h3>
                    <p className="about-project-subtitle">{project.subtitle}</p>
                    <p className="about-project-description">{project.description}</p>
                  </div>
                  <span className="about-project-number" aria-hidden="true">
                    0{index + 1}
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="about-approach-section" aria-labelledby="about-approach-heading">
          <div className="page-shell">
            <div className="about-approach-heading">
              <div className="section-marker">
                <span className="marker-line" />
                <span>{about.approach.label}</span>
              </div>
              <h2 id="about-approach-heading">{about.approach.heading}</h2>
              <p>{about.approach.intro}</p>
            </div>
            <ol className="about-approach-steps">
              {about.approach.steps.map((step, index) => (
                <li key={step}>
                  <span className="approach-step-number">0{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="about-approach-note">{about.approach.disclaimer}</p>
          </div>
        </section>

        <section className="about-beyond-section" aria-labelledby="about-beyond-heading">
          <div className="page-shell about-beyond-layout">
            <div className="section-marker">
              <span className="marker-line" />
              <span>{about.beyond.label}</span>
            </div>
            <div>
              <h2 id="about-beyond-heading">{about.beyond.heading}</h2>
              <p>{about.beyond.description}</p>
            </div>
            <span className="about-beyond-symbol" aria-hidden="true">
              ∞
            </span>
          </div>
        </section>

        <section className="about-cta-section" aria-labelledby="about-cta-heading">
          <div className="page-shell about-cta-inner">
            <div className="about-cta-glow" aria-hidden="true" />
            <p className="eyebrow">{about.closing.eyebrow}</p>
            <h2 id="about-cta-heading">{about.closing.heading}</h2>
            <p className="about-cta-description">{about.closing.description}</p>
            <div className="about-cta-actions">
              <Link className="button button-primary" href="/#contact">
                {about.closing.contactButton} <ArrowIcon />
              </Link>
              <Link className="button button-secondary" href="/#projects">
                {about.closing.projectsButton} <ArrowIcon />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
