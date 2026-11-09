import { projects } from "@/data/projects";
import { skills } from "@/data/skills";
import SiteHeader from "./components/SiteHeader";

const highlights = [
  "Business Analysis",
  "Requirement Engineering",
  "Process Modeling",
  "Technology Solutions",
];
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

function ProjectArtwork({ index }: { index: number }) {
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
        <span className="art-caption">CINEMA / BOOKING</span>
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
      <span className="art-caption">MEMBERS / OPERATIONS</span>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
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
                Hello, welcome to my portfolio
              </p>
              <h1 id="hero-heading">
                I&apos;m <span className="gradient-text">GLUZ.</span>
              </h1>
              <p className="hero-role">Aspiring IT Business Analyst</p>
              <p className="hero-statement">
                Turning business needs into meaningful digital solutions.
              </p>
              <p className="hero-description">
                I&apos;m an IT graduate interested in Business Analysis,
                requirement engineering, and technology-driven solutions. I
                enjoy understanding business problems and translating
                requirements into structured solutions.
              </p>
              <div className="hero-actions">
                <a className="button button-primary" href="#projects">
                  Explore My Projects <ArrowIcon />
                </a>
                <a className="button button-secondary" href="#about">
                  About Me
                </a>
              </div>
              <p className="hero-footnote">
                Software Engineering · HUFLIT · Vietnam
              </p>
            </div>

            <div className="hero-visual" aria-label="GLUZ personal brand artwork">
              <div className="visual-glow" />
              <div className="visual-grid" />
              <div className="visual-orbit visual-orbit-a" />
              <div className="visual-orbit visual-orbit-b" />
              <div className="visual-cross visual-cross-a" />
              <div className="visual-cross visual-cross-b" />
              <div className="visual-monogram">
                <span className="monogram-kicker">BUSINESS × TECHNOLOGY</span>
                <span className="monogram-name">GLUZ</span>
                <span className="monogram-rule" />
                <span className="monogram-caption">
                  Understand the need.
                  <br />
                  Shape the solution.
                </span>
              </div>
              <span className="visual-coordinate">10°46&apos; N — 106°40&apos; E</span>
              <span className="visual-index">TDM / 01</span>
            </div>
          </div>
          <div className="hero-bottom-line page-shell">
            <span>Curious by nature</span>
            <span>Structured by design</span>
          </div>
        </section>

        <section className="highlights-section" aria-label="Areas of interest">
          <div className="page-shell highlights-row">
            {highlights.map((highlight, index) => (
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
              <span>About me</span>
            </div>
            <div className="about-content">
              <h2 id="about-heading">
                Understanding business.
                <br />
                <span className="text-muted">Connecting technology.</span>
              </h2>
              <p>
                I believe great digital solutions start with understanding the
                right problems. My focus is on analyzing business needs,
                organizing requirements, and connecting business expectations
                with technical implementation.
              </p>
              <a className="text-link" href="#skills">
                More About Me <ArrowIcon />
              </a>
            </div>
            <div className="about-aside" aria-hidden="true">
              <span className="aside-symbol">↗</span>
              <span>Clarity is a feature.</span>
              <span className="aside-rule" />
              <span>Build from understanding.</span>
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
                  <span>Selected work</span>
                </div>
                <h2 id="projects-heading">Turning ideas into solutions.</h2>
              </div>
              <p className="section-intro">
                Academic projects focused on understanding requirements and
                shaping useful systems.
              </p>
            </div>
            <div className="project-list">
              {projects.map((project, index) => (
                <article
                  className="project-card"
                  id={`project-${project.slug}`}
                  key={project.slug}
                >
                  <ProjectArtwork index={index} />
                  <div className="project-content">
                    <div className="project-meta">
                      <span className="category-badge">Business Analysis</span>
                      <span className="academic-label">Academic project</span>
                    </div>
                    <h3>{project.title}</h3>
                    <p className="project-description">
                      {project.description}
                    </p>
                    <div
                      className="deliverables"
                      id={`deliverables-${project.slug}`}
                    >
                      <span className="deliverables-label">
                        Selected deliverables
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
                      aria-label={`View ${project.title} project deliverables`}
                    >
                      View Project <ArrowIcon />
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
              <span>Capabilities</span>
            </div>
            <div className="section-heading-row skills-heading-row">
              <h2 id="skills-heading">What I bring to the table.</h2>
              <p className="section-intro">
                A foundation across analysis, process, data, and the details
                that make a product easier to use.
              </p>
            </div>
            <div className="skills-grid">
              {skills.map((group, index) => (
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
                <span>Start a conversation</span>
              </div>
              <h2 id="contact-heading">Let&apos;s connect.</h2>
              <p>
                Open to opportunities, collaboration, and continuous learning.
              </p>
            </div>
            <div className="contact-actions" aria-label="Contact links">
              <a className="button button-contact" href="mailto:EMAIL_HERE">
                Email <ArrowIcon />
              </a>
              <a
                className="button button-contact-quiet"
                href="LINKEDIN_HERE"
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn <ArrowIcon />
              </a>
              <a
                className="button button-contact-quiet"
                href="GITHUB_HERE"
                target="_blank"
                rel="noreferrer"
              >
                GitHub <ArrowIcon />
              </a>
            </div>
            <div className="contact-orb" aria-hidden="true" />
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="page-shell footer-inner">
          <a className="footer-brand" href="#home" aria-label="TDM GLUZ, back to top">
            TDM <span>GLUZ</span>
            <i aria-hidden="true" />
          </a>
          <p>Think. Analyze. Create.</p>
          <div className="footer-meta">
            <span>© {currentYear} TDM GLUZ</span>
            <a href="#home">
              Back to top <span aria-hidden="true">↑</span>
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
