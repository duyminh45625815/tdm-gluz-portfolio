import PageEditor from "../../PageEditor";

export default function AboutPageAdminPage() {
  return (
    <PageEditor
      slug="about"
      title="About Page"
      sections="metadata, hero, story, education, areas, knowledge, projects, approach, beyond, closing"
    />
  );
}
