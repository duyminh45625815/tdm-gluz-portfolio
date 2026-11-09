export type SkillGroup = {
  title: string;
  items: string[];
};

export const skills: SkillGroup[] = [
  {
    title: "Requirement Analysis",
    items: [
      "BRD",
      "FRD",
      "User Stories",
      "Use Cases",
    ],
  },
  {
    title: "Process Modeling",
    items: [
      "Activity Diagram",
      "Sequence Diagram",
      "Business Process Analysis",
    ],
  },
  {
    title: "Data & Technology",
    items: ["SQL Server", "Software Development Fundamentals"],
  },
  {
    title: "Design & Testing",
    items: ["Figma", "Wireframing", "Manual Testing", "Test Case Design"],
  },
];
