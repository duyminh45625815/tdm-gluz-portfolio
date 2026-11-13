import Link from "next/link";

const sections = [
  {
    href: "/admin/settings",
    title: "Site Settings",
    description: "Manage site identity, locales, navigation and shared content.",
  },
  {
    href: "/admin/home",
    title: "Home Page",
    description: "Edit localized home page drafts and publishing status.",
  },
  {
    href: "/admin/about",
    title: "About Page",
    description: "Manage the About page content for each locale.",
  },
  {
    href: "/admin/projects",
    title: "Projects",
    description: "Create and organize the portfolio project entries.",
  },
  {
    href: "/admin/skill-groups",
    title: "Skill Groups",
    description: "Edit skill group content and its presentation settings.",
  },
  {
    href: "/admin/education",
    title: "Education",
    description: "Manage education records and their display order.",
  },
];

export default function AdminDashboardPage() {
  return (
    <>
      <section className="admin-page-heading">
        <p className="admin-eyebrow">Workspace</p>
        <h2>Manage your portfolio</h2>
        <p>Choose a section to review and update its content.</p>
      </section>
      <nav className="admin-dashboard-grid" aria-label="Content management">
        {sections.map((section) => (
          <Link
            className="admin-dashboard-link"
            href={section.href}
            key={section.href}
          >
            <span>{section.title}</span>
            <p>{section.description}</p>
            <span className="admin-dashboard-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        ))}
      </nav>
    </>
  );
}
