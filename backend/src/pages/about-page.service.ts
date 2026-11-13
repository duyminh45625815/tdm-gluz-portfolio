import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Error as MongooseError, type Model } from 'mongoose';
import { createPublishLocaleUpdate } from '../common/localized-update.utils.js';
import {
  SUPPORTED_LOCALES,
  type Locale,
} from '../common/localization.types.js';
import {
  PAGE_MODEL,
  type AboutPageContent,
  type Page,
  type PageDocument,
} from './page.schema.js';
import {
  type AboutPageContentDto,
  type AboutPageResponseDto,
} from './about-page.dto.js';

const ABOUT_PAGE_FILTER = { slug: 'about' } as const;

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseLocale(value: string): Locale {
  if ((SUPPORTED_LOCALES as readonly string[]).includes(value)) {
    return value as Locale;
  }

  throw new BadRequestException('Unsupported locale.');
}

function flattenSet(
  updates: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  if (value === undefined) {
    return;
  }

  if (isRecord(value)) {
    for (const [key, nestedValue] of Object.entries(value)) {
      flattenSet(updates, `${path}.${key}`, nestedValue);
    }
    return;
  }

  updates[path] = value;
}

function mergeContent<T extends object>(base: T | undefined, patch: T): T {
  const merged: Record<string, unknown> = {
    ...(base as Record<string, unknown> | undefined),
  };

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      continue;
    }

    const previous = merged[key];
    merged[key] =
      isRecord(previous) && isRecord(value)
        ? mergeContent(previous, value)
        : value;
  }

  return merged as T;
}

function hasContent(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.some(hasContent);
  }
  if (isRecord(value)) {
    return Object.values(value).some(hasContent);
  }

  return value !== undefined && value !== null;
}

function toResponseDto(document: PageDocument): AboutPageResponseDto {
  const page = document.toObject();

  return {
    slug: 'about',
    draft: page.draft,
    published: page.published,
  };
}

@Injectable()
export class AboutPageService {
  constructor(
    @InjectModel(PAGE_MODEL)
    private readonly pages: Model<Page>,
  ) {}

  async getAboutPage(): Promise<AboutPageResponseDto> {
    const page = await this.pages.findOne(ABOUT_PAGE_FILTER).exec();
    if (!page) {
      throw new NotFoundException('About page has not been initialized.');
    }

    return toResponseDto(page);
  }

  async initializeAboutPage(): Promise<AboutPageResponseDto> {
    await this.pages.init();
    const existing = await this.pages.exists(ABOUT_PAGE_FILTER).exec();
    if (existing) {
      throw new ConflictException('About page already exists.');
    }

    try {
      return toResponseDto(await this.pages.create({ slug: 'about' }));
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('About page already exists.');
      }

      throw error;
    }
  }

  async updateDraft(
    localeValue: string,
    dto: AboutPageContentDto,
  ): Promise<AboutPageResponseDto> {
    const locale = parseLocale(localeValue);
    const updates: Record<string, unknown> = {};
    flattenSet(updates, `draft.${locale}`, dto);

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException(
        'At least one About page draft value must be provided.',
      );
    }

    const currentPage = await this.pages.findOne(ABOUT_PAGE_FILTER).exec();
    if (!currentPage) {
      throw new NotFoundException('About page has not been initialized.');
    }

    const currentDraft = currentPage.toObject().draft?.[locale];
    const mergedDraft = mergeContent(currentDraft, dto);
    await this.validateDraft(locale, mergedDraft);

    const updatedPage = await this.pages
      .findOneAndUpdate(
        ABOUT_PAGE_FILTER,
        { $set: updates },
        { new: true, runValidators: true },
      )
      .exec();
    if (!updatedPage) {
      throw new NotFoundException('About page has not been initialized.');
    }

    return toResponseDto(updatedPage);
  }

  async publishLocale(localeValue: string): Promise<AboutPageResponseDto> {
    const locale = parseLocale(localeValue);
    const currentPage = await this.pages.findOne(ABOUT_PAGE_FILTER).exec();
    if (!currentPage) {
      throw new NotFoundException('About page has not been initialized.');
    }

    const draft = currentPage.toObject().draft?.[locale];
    if (!draft || !hasContent(draft)) {
      throw new ConflictException(
        'A valid About page draft is required before publishing.',
      );
    }

    try {
      await this.validateDraft(locale, draft);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new ConflictException(
          'A valid About page draft is required before publishing.',
        );
      }
      throw error;
    }

    const operation = createPublishLocaleUpdate(locale);
    const draftPath = `draft.${locale}`;
    const publishQuery = this.pages.findOneAndUpdate(
      { ...ABOUT_PAGE_FILTER, ...operation.filter },
      operation.pipeline,
      { new: true, ...operation.options },
    );
    if (typeof publishQuery.setQuery === 'function') {
      publishQuery.setQuery({
        ...ABOUT_PAGE_FILTER,
        $and: [
          operation.filter,
          { [draftPath]: { $eq: draft } },
        ],
      });
    }

    const updatedPage = await publishQuery.exec();
    if (!updatedPage) {
      throw new ConflictException(
        'A valid About page draft is required before publishing.',
      );
    }

    return toResponseDto(updatedPage);
  }

  private async validateDraft(
    locale: Locale,
    content: AboutPageContent,
  ): Promise<void> {
    const draft: NonNullable<Page['draft']> = { [locale]: content };
    const candidate = new this.pages({ slug: 'about', draft });

    try {
      await candidate.validate();
    } catch (error) {
      if (error instanceof MongooseError.ValidationError) {
        throw new BadRequestException('About page draft is invalid.');
      }

      throw error;
    }
  }
}
