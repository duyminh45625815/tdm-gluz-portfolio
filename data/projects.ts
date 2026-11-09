export type Project = {
  slug: string;
  title: string;
  description: string;
  deliverables: string[];
};

export const projects: Project[] = [
  {
    slug: "cinevie-plus",
    title: "CineVie+",
    description:
      "An academic project focused on analyzing requirements and designing an online cinema ticket booking solution.",
    deliverables: [
      "BRD",
      "FRD",
      "User Stories",
      "UML Diagrams",
      "Figma Wireframes",
    ],
  },
  {
    slug: "gym-management",
    title: "Gym Management System",
    description:
      "An academic project focused on analyzing business workflows and system requirements for gym management.",
    deliverables: [
      "Requirements Documentation",
      "Use Cases",
      "Process Modeling",
    ],
  },
];
