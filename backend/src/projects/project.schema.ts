import { Schema, type HydratedDocument } from 'mongoose';
import { displayOrderField } from '../common/display-order.schema.js';
import { presentationsSchema } from '../common/presentation.schema.js';
import { createLocaleMapSchema } from '../common/localization.schema.js';
import type { LocalizedVersions } from '../common/localization.types.js';

export const PROJECT_MODEL = 'Project';
export const PROJECT_COLLECTION = 'projects';

export const PROJECT_CATEGORIES = [
  'academic',
  'professional',
  'personal',
  'other',
] as const;
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export interface ProjectContent {
  title?: string;
  subtitle?: string;
  description?: string;
  deliverables?: string[];
  role?: string;
}

export interface ProjectLinks {
  github?: string;
  demo?: string;
  figma?: string;
}

export interface ProjectPresentations {
  home?: boolean;
  about?: boolean;
}

export interface Project extends LocalizedVersions<ProjectContent> {
  slug: string;
  category: ProjectCategory;
  links?: ProjectLinks;
  presentations?: ProjectPresentations;
  displayOrder: number;
}

const projectContentSchema = new Schema<ProjectContent>(
  {
    title: { type: String, trim: true },
    subtitle: { type: String, trim: true },
    description: { type: String, trim: true },
    deliverables: { type: [{ type: String, trim: true }], default: undefined },
    role: { type: String, trim: true },
  },
  { _id: false, strict: true },
);

const linksSchema = new Schema<ProjectLinks>(
  {
    github: { type: String, trim: true },
    demo: { type: String, trim: true },
    figma: { type: String, trim: true },
  },
  { _id: false, strict: true },
);

const localizedProjectContentSchema =
  createLocaleMapSchema(projectContentSchema);

export const ProjectSchema = new Schema<Project>(
  {
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    category: { type: String, enum: PROJECT_CATEGORIES, required: true },
    draft: { type: localizedProjectContentSchema, default: undefined },
    published: { type: localizedProjectContentSchema, default: undefined },
    links: { type: linksSchema, default: undefined },
    presentations: { type: presentationsSchema, default: () => ({}) },
    displayOrder: displayOrderField(),
  },
  { timestamps: true, strict: true, collection: PROJECT_COLLECTION },
);

ProjectSchema.index({ slug: 1 }, { unique: true });

export type ProjectDocument = HydratedDocument<Project>;
