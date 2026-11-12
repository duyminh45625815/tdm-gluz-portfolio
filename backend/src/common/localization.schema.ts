import { Schema } from 'mongoose';
import type { LocalizedText } from './localization.types.js';

export const localizedTextSchema = new Schema<LocalizedText>(
  {
    vi: { type: String, trim: true },
    en: { type: String, trim: true },
    ja: { type: String, trim: true },
    ko: { type: String, trim: true },
  },
  { _id: false, strict: true },
);

export function createLocaleMapSchema(contentSchema: Schema): Schema {
  return new Schema(
    {
      vi: { type: contentSchema, default: undefined },
      en: { type: contentSchema, default: undefined },
      ja: { type: contentSchema, default: undefined },
      ko: { type: contentSchema, default: undefined },
    },
    { _id: false, strict: true },
  );
}
