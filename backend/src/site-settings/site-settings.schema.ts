import { Schema, type HydratedDocument } from 'mongoose';
import {
  SUPPORTED_LOCALES,
  type Locale,
  type LocalizedText,
} from '../common/localization.types.js';
import { localizedTextSchema } from '../common/localization.schema.js';

export const SITE_SETTINGS_MODEL = 'SiteSettings';
export const SITE_SETTINGS_COLLECTION = 'siteSettings';

export interface SiteIdentity {
  name?: LocalizedText;
  title?: LocalizedText;
  tagline?: LocalizedText;
}

export interface ContactSettings {
  email?: string;
  phone?: string;
  location?: LocalizedText;
  socialLinks?: Map<string, string>;
}

export interface LocalizationSettings {
  defaultLocale: Locale;
  supportedLocales: Locale[];
}

export interface SiteTranslations {
  navigation?: Map<string, LocalizedText>;
  footer?: Map<string, LocalizedText>;
  shared?: Map<string, LocalizedText>;
}

export interface SiteSettings {
  key: 'main';
  identity?: SiteIdentity;
  contact?: ContactSettings;
  localization: LocalizationSettings;
  translations?: SiteTranslations;
}

const identitySchema = new Schema<SiteIdentity>(
  {
    name: { type: localizedTextSchema },
    title: { type: localizedTextSchema },
    tagline: { type: localizedTextSchema },
  },
  { _id: false, strict: true },
);

const contactSchema = new Schema<ContactSettings>(
  {
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    location: { type: localizedTextSchema },
    socialLinks: { type: Map, of: String },
  },
  { _id: false, strict: true },
);

const localizationSchema = new Schema<LocalizationSettings>(
  {
    defaultLocale: {
      type: String,
      enum: SUPPORTED_LOCALES,
      required: true,
    },
    supportedLocales: {
      type: [{ type: String, enum: SUPPORTED_LOCALES }],
      required: true,
      default: [...SUPPORTED_LOCALES],
      validate: {
        validator: (locales: Locale[]) =>
          locales.length === SUPPORTED_LOCALES.length &&
          SUPPORTED_LOCALES.every((locale) => locales.includes(locale)),
        message: 'supportedLocales must include each supported locale exactly once',
      },
    },
  },
  { _id: false, strict: true },
);

const translationsSchema = new Schema<SiteTranslations>(
  {
    navigation: { type: Map, of: localizedTextSchema },
    footer: { type: Map, of: localizedTextSchema },
    shared: { type: Map, of: localizedTextSchema },
  },
  { _id: false, strict: true },
);

export const SiteSettingsSchema = new Schema<SiteSettings>(
  {
    key: { type: String, enum: ['main'], required: true, default: 'main' },
    identity: { type: identitySchema, default: undefined },
    contact: { type: contactSchema, default: undefined },
    localization: { type: localizationSchema, required: true },
    translations: { type: translationsSchema, default: undefined },
  },
  { timestamps: true, strict: true, collection: SITE_SETTINGS_COLLECTION },
);

SiteSettingsSchema.index({ key: 1 }, { unique: true });

export type SiteSettingsDocument = HydratedDocument<SiteSettings>;
