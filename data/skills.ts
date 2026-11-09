export type SkillGroup = {
  category: string;
  skills: string[];
};

export const skills: SkillGroup[] = [
  {
    category: "Phân tích nghiệp vụ",
    skills: [
      "BRD",
      "FRD",
      "SRS",
      "Use Case",
      "User Story",
      "Acceptance Criteria",
      "BPMN",
      "UML",
    ],
  },
  {
    category: "Dữ liệu",
    skills: [
      "SQL (SELECT, JOIN, GROUP BY, WHERE, procedure và trigger cơ bản)",
      "ERD",
      "SQL Server",
    ],
  },
  {
    category: "Công cụ",
    skills: ["Draw.io", "Figma (cơ bản)", "Postman", "Odoo ERP"],
  },
];
