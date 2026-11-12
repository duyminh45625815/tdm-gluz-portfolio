import { Schema, type HydratedDocument } from 'mongoose';
import { displayOrderField } from '../common/display-order.schema.js';
import { presentationsSchema } from '../common/presentation.schema.js';
import { createLocaleMapSchema } from '../common/localization.schema.js';
import type { LocalizedVersions } from '../common/localization.types.js';

export const SKILL_GROUP_MODEL = 'SkillGroup';
export const SKILL_GROUP_COLLECTION = 'skillGroups';

export interface SkillGroupContent {
  home?: {
    title?: string;
    items?: string[];
  };
  about?: {
    title?: string;
    items?: string[];
  };
}

export interface SkillGroup extends LocalizedVersions<SkillGroupContent> {
  key: string;
  presentations?: {
    home?: boolean;
    about?: boolean;
  };
  displayOrder: number;
}

const skillPresentationContentSchema = new Schema(
  {
    title: { type: String, trim: true },
    items: { type: [{ type: String, trim: true }], default: undefined },
  },
  { _id: false, strict: true },
);

const skillGroupContentSchema = new Schema<SkillGroupContent>(
  {
    home: { type: skillPresentationContentSchema, default: undefined },
    about: { type: skillPresentationContentSchema, default: undefined },
  },
  { _id: false, strict: true },
);

const localizedSkillGroupContentSchema =
  createLocaleMapSchema(skillGroupContentSchema);

export const SkillGroupSchema = new Schema<SkillGroup>(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    draft: { type: localizedSkillGroupContentSchema, default: undefined },
    published: { type: localizedSkillGroupContentSchema, default: undefined },
    presentations: { type: presentationsSchema, default: () => ({}) },
    displayOrder: displayOrderField(),
  },
  { timestamps: true, strict: true, collection: SKILL_GROUP_COLLECTION },
);

SkillGroupSchema.index({ key: 1 }, { unique: true });

export type SkillGroupDocument = HydratedDocument<SkillGroup>;
