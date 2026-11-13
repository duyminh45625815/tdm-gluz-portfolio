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
  type HomePageContent,
  type Page,
  type PageDocument,
} from './page.schema.js';
import {
  type HomePageContentDto,
  type HomePageResponseDto,
} from './home-page.dto.js';

const HOME_PAGE_FILTER = { slug: 'home' } as const;

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

function toResponseDto(document: PageDocument): HomePageResponseDto {
  const page = document.toObject();

  return {
    slug: 'home',
    draft: page.draft,
    published: page.published,
  };
}

@Injectable()
export class HomePageService {
  constructor(
    @InjectModel(PAGE_MODEL)
    private readonly pages: Model<Page>,
  ) {}

  async getHomePage(): Promise<HomePageResponseDto> {
    const page = await this.pages.findOne(HOME_PAGE_FILTER).exec();
    if (!page) {
      throw new NotFoundException('Home page has not been initialized.');
    }

    return toResponseDto(page);
  }

  async initializeHomePage(): Promise<HomePageResponseDto> {
    await this.pages.init();
    const existing = await this.pages.exists(HOME_PAGE_FILTER).exec();
    if (existing) {
      throw new ConflictException('Home page already exists.');
    }

    try {
      return toResponseDto(await this.pages.create({ slug: 'home' }));
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('Home page already exists.');
      }

      throw error;
    }
  }

  async updateDraft(
    localeValue: string,
    dto: HomePageContentDto,
  ): Promise<HomePageResponseDto> {
    const locale = parseLocale(localeValue);
    const updates: Record<string, unknown> = {};
    flattenSet(updates, `draft.${locale}`, dto);

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException(
        'At least one Home page draft value must be provided.',
      );
    }

    const currentPage = await this.pages.findOne(HOME_PAGE_FILTER).exec();
    if (!currentPage) {
      throw new NotFoundException('Home page has not been initialized.');
    }

    const currentDraft = currentPage.toObject().draft?.[locale];
    const mergedDraft = mergeContent(currentDraft, dto);
    await this.validateDraft(locale, mergedDraft);

    const updatedPage = await this.pages
      .findOneAndUpdate(
        HOME_PAGE_FILTER,
        { $set: updates },
        { new: true, runValidators: true },
      )
      .exec();
    if (!updatedPage) {
      throw new NotFoundException('Home page has not been initialized.');
    }

    return toResponseDto(updatedPage);
  }

  async publishLocale(localeValue: string): Promise<HomePageResponseDto> {
    const locale = parseLocale(localeValue);
    const currentPage = await this.pages.findOne(HOME_PAGE_FILTER).exec();
    if (!currentPage) {
      throw new NotFoundException('Home page has not been initialized.');
    }

    const draft = currentPage.toObject().draft?.[locale];
    if (!draft || !hasContent(draft)) {
      throw new ConflictException(
        'A valid Home page draft is required before publishing.',
      );
    }

    try {
      await this.validateDraft(locale, draft);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new ConflictException(
          'A valid Home page draft is required before publishing.',
        );
      }
      throw error;
    }

    const operation = createPublishLocaleUpdate(locale);
    const draftPath = `draft.${locale}`;
    const publishQuery = this.pages.findOneAndUpdate(
      { ...HOME_PAGE_FILTER, ...operation.filter },
      operation.pipeline,
      { new: true, ...operation.options },
    );
    if (typeof publishQuery.setQuery === 'function') {
      publishQuery.setQuery({
        ...HOME_PAGE_FILTER,
        $and: [
          operation.filter,
          { [draftPath]: { $eq: draft } },
        ],
      });
    }

    const updatedPage = await publishQuery.exec();
    if (!updatedPage) {
      throw new ConflictException(
        'A valid Home page draft is required before publishing.',
      );
    }

    return toResponseDto(updatedPage);
  }

  private async validateDraft(
    locale: Locale,
    content: HomePageContent,
  ): Promise<void> {
    const draft: NonNullable<Page['draft']> = { [locale]: content };
    const candidate = new this.pages({ slug: 'home', draft });

    try {
      await candidate.validate();
    } catch (error) {
      if (error instanceof MongooseError.ValidationError) {
        throw new BadRequestException('Home page draft is invalid.');
      }

      throw error;
    }
  }
}
