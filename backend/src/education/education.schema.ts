import { Schema, type HydratedDocument } from 'mongoose';
import { displayOrderField } from '../common/display-order.schema.js';
import { presentationsSchema } from '../common/presentation.schema.js';
import { createLocaleMapSchema } from '../common/localization.schema.js';
import type { LocalizedVersions } from '../common/localization.types.js';

export const EDUCATION_MODEL = 'Education';
export const EDUCATION_COLLECTION = 'education';

export const EDUCATION_TYPES = [
  'university',
  'certificate',
  'course',
  'achievement',
] as const;
export type EducationType = (typeof EDUCATION_TYPES)[number];

export interface EducationContent {
  institution?: string;
  title?: string;
  degree?: string;
  major?: string;
  status?: string;
  description?: string;
}

export interface Education extends LocalizedVersions<EducationContent> {
  type: EducationType;
  startDate?: Date;
  endDate?: Date;
  presentations?: {
    home?: boolean;
    about?: boolean;
  };
  displayOrder: number;
}

const educationContentSchema = new Schema<EducationContent>(
  {
    institution: { type: String, trim: true },
    title: { type: String, trim: true },
    degree: { type: String, trim: true },
    major: { type: String, trim: true },
    status: { type: String, trim: true },
    description: { type: String, trim: true },
  },
  { _id: false, strict: true },
);

const localizedEducationContentSchema =
  createLocaleMapSchema(educationContentSchema);

export const EducationSchema = new Schema<Education>(
  {
    type: { type: String, enum: EDUCATION_TYPES, required: true },
    draft: { type: localizedEducationContentSchema, default: undefined },
    published: { type: localizedEducationContentSchema, default: undefined },
    startDate: { type: Date },
    endDate: { type: Date },
    presentations: { type: presentationsSchema, default: () => ({}) },
    displayOrder: displayOrderField(),
  },
  { timestamps: true, strict: true, collection: EDUCATION_COLLECTION },
);

EducationSchema.index({ type: 1, displayOrder: 1 });

EducationSchema.pre('validate', function validateDateRange() {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'endDate cannot be earlier than startDate');
  }
});

export type EducationDocument = HydratedDocument<Education>;
