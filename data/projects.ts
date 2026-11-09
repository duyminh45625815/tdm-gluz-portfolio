export type Project = {
  slug: string;
  title: string;
  period: string;
  description: string;
  documents: string[];
  tools?: string[];
};

export const projects: Project[] = [
  {
    slug: "gym-management",
    title: "Gym Business Management System",
    period: "Tháng 12/2023 - 3/2024",
    description:
      "Dự án đầu tiên của mình: phân tích yêu cầu cho hệ thống quản lý phòng gym.",
    documents: ["BRD", "FRD", "Use Case"],
  },
  {
    slug: "cinevie-plus",
    title: "CINEVIE+ Online Ticketing",
    period: "Tháng 5 - 7/2025",
    description:
      "Phân tích yêu cầu cho hệ thống bán vé xem phim trực tuyến.",
    documents: ["SRS", "Use Case", "User Story", "BPMN/UML"],
    tools: ["Draw.io", "Figma (basic)", "Postman", "SQL Server"],
  },
];
