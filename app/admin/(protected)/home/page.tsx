import PageEditor from "../../PageEditor";

export default function HomePageAdminPage() {
  return (
    <PageEditor
      slug="home"
      title="Home Page"
      sections="metadata, hero, highlights, about, projects, skills, contact"
    />
  );
}
