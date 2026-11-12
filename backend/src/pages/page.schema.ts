import { Schema, type HydratedDocument } from 'mongoose';
import { createLocaleMapSchema } from '../common/localization.schema.js';
import {
  SUPPORTED_LOCALES,
  type LocalizedVersions,
} from '../common/localization.types.js';

export const PAGE_MODEL = 'Page';
export const PAGE_COLLECTION = 'pages';

export const PAGE_SLUGS = ['home', 'about'] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];

const HOME_ONLY_SECTIONS = ['highlights', 'about', 'skills', 'contact'];
const ABOUT_ONLY_SECTIONS = [
  'story',
  'education',
  'areas',
  'knowledge',
  'approach',
  'beyond',
  'closing',
];

export interface PageMetadata {
  title?: string;
  description?: string;
  imageUrl?: string;
}

export interface PageAction {
  label?: string;
  href?: string;
}

export interface HeroSection {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  primaryAction?: PageAction;
  secondaryAction?: PageAction;
}

export interface ContentSection {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  body?: string;
}

export interface HighlightItem {
  label?: string;
  value?: string;
  description?: string;
}

export interface HighlightsSection extends ContentSection {
  items?: HighlightItem[];
}

export interface HomePageContent {
  metadata?: PageMetadata;
  hero?: HeroSection;
  highlights?: HighlightsSection;
  about?: ContentSection;
  projects?: ContentSection;
  skills?: ContentSection;
  contact?: ContentSection;
}

export interface AboutPageContent {
  metadata?: PageMetadata;
  hero?: HeroSection;
  story?: ContentSection;
  education?: ContentSection;
  areas?: ContentSection;
  knowledge?: ContentSection;
  projects?: ContentSection;
  approach?: ContentSection;
  beyond?: ContentSection;
  closing?: ContentSection;
}

export interface PageContent
  extends HomePageContent, AboutPageContent {}

export interface Page extends LocalizedVersions<PageContent> {
  slug: PageSlug;
}

const metadataSchema = new Schema<PageMetadata>(
  {
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
  },
  { _id: false, strict: true },
);

const pageActionSchema = new Schema<PageAction>(
  {
    label: { type: String, trim: true },
    href: { type: String, trim: true },
  },
  { _id: false, strict: true },
);

const heroSchema = new Schema<HeroSection>(
  {
    eyebrow: { type: String, trim: true },
    title: { type: String, trim: true },
    subtitle: { type: String, trim: true },
    description: { type: String, trim: true },
    primaryAction: { type: pageActionSchema, default: undefined },
    secondaryAction: { type: pageActionSchema, default: undefined },
  },
  { _id: false, strict: true },
);

const contentSectionSchema = new Schema<ContentSection>(
  {
    eyebrow: { type: String, trim: true },
    title: { type: String, trim: true },
    subtitle: { type: String, trim: true },
    description: { type: String, trim: true },
    body: { type: String, trim: true },
  },
  { _id: false, strict: true },
);

const highlightItemSchema = new Schema<HighlightItem>(
  {
    label: { type: String, trim: true },
    value: { type: String, trim: true },
    description: { type: String, trim: true },
  },
  { _id: false, strict: true },
);

const highlightsSchema = new Schema<HighlightsSection>(
  {
    eyebrow: { type: String, trim: true },
    title: { type: String, trim: true },
    subtitle: { type: String, trim: true },
    description: { type: String, trim: true },
    body: { type: String, trim: true },
    items: { type: [highlightItemSchema], default: undefined },
  },
  { _id: false, strict: true },
);

const pageContentSchema = new Schema<PageContent>(
  {
    metadata: { type: metadataSchema, default: undefined },
    hero: { type: heroSchema, default: undefined },
    highlights: { type: highlightsSchema, default: undefined },
    about: { type: contentSectionSchema, default: undefined },
    projects: { type: contentSectionSchema, default: undefined },
    skills: { type: contentSectionSchema, default: undefined },
    contact: { type: contentSectionSchema, default: undefined },
    story: { type: contentSectionSchema, default: undefined },
    education: { type: contentSectionSchema, default: undefined },
    areas: { type: contentSectionSchema, default: undefined },
    knowledge: { type: contentSectionSchema, default: undefined },
    approach: { type: contentSectionSchema, default: undefined },
    beyond: { type: contentSectionSchema, default: undefined },
    closing: { type: contentSectionSchema, default: undefined },
  },
  { _id: false, strict: true },
);

const localizedPageContentSchema = createLocaleMapSchema(pageContentSchema);

export const PageSchema = new Schema<Page>(
  {
    slug: { type: String, enum: PAGE_SLUGS, required: true },
    draft: { type: localizedPageContentSchema, default: undefined },
    published: { type: localizedPageContentSchema, default: undefined },
  },
  { timestamps: true, strict: true, collection: PAGE_COLLECTION },
);

PageSchema.index({ slug: 1 }, { unique: true });

PageSchema.pre('validate', function validatePageSections() {
  const invalidSections =
    this.slug === 'home' ? ABOUT_ONLY_SECTIONS : HOME_ONLY_SECTIONS;

  for (const version of ['draft', 'published'] as const) {
    for (const locale of SUPPORTED_LOCALES) {
      for (const section of invalidSections) {
        const path = `${version}.${locale}.${section}`;

        if (this.get(path) !== undefined) {
          this.invalidate(
            path,
            `Section "${section}" is not valid for the "${this.slug}" page`,
          );
        }
      }
    }
  }
});

export type PageDocument = HydratedDocument<Page>;
