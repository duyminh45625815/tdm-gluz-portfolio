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
  EDUCATION_MODEL,
  type Education,
  type EducationDocument,
  type EducationType,
} from './education.schema.js';
import {
  type CreateEducationDto,
  type EducationResponseDto,
  type UpdateEducationDraftDto,
  type UpdateEducationDto,
} from './education-admin.dto.js';

const OBJECT_ID_PATTERN = /^[\da-f]{24}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseId(value: string): string {
  if (!OBJECT_ID_PATTERN.test(value)) {
    throw new BadRequestException('Invalid education record id.');
  }

  return value;
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

function asDate(value: string | Date | undefined): Date | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value instanceof Date ? value : new Date(value);
}

function validateDateRange(
  startDate: string | Date | undefined,
  endDate: string | Date | undefined,
): void {
  const start = asDate(startDate);
  const end = asDate(endDate);
  if (
    start &&
    end &&
    (!Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      end < start)
  ) {
    throw new BadRequestException(
      'Education endDate cannot be earlier than startDate.',
    );
  }
}

function toResponseDto(
  document: EducationDocument,
): EducationResponseDto {
  const education = document.toObject();

  return {
    id: education._id.toString(),
    type: education.type,
    draft: education.draft,
    published: education.published,
    startDate: education.startDate,
    endDate: education.endDate,
    presentations: education.presentations,
    displayOrder: education.displayOrder,
  };
}

@Injectable()
export class EducationAdminService {
  constructor(
    @InjectModel(EDUCATION_MODEL)
    private readonly education: Model<Education>,
  ) {}

  async getEducationRecords(): Promise<EducationResponseDto[]> {
    const records = await this.education
      .find({})
      .sort({ type: 1, displayOrder: 1, _id: 1 })
      .exec();
    return records.map(toResponseDto);
  }

  async getEducationRecord(idValue: string): Promise<EducationResponseDto> {
    const id = parseId(idValue);
    const record = await this.education.findOne({ _id: id }).exec();
    if (!record) {
      throw new NotFoundException('Education record not found.');
    }

    return toResponseDto(record);
  }

  async createEducationRecord(
    dto: CreateEducationDto,
  ): Promise<EducationResponseDto> {
    validateDateRange(dto.startDate, dto.endDate);
    const record = await this.education.create({
      type: dto.type,
      ...(dto.startDate !== undefined
        ? { startDate: asDate(dto.startDate) }
        : {}),
      ...(dto.endDate !== undefined ? { endDate: asDate(dto.endDate) } : {}),
      ...(dto.displayOrder !== undefined
        ? { displayOrder: dto.displayOrder }
        : {}),
      ...(dto.presentations !== undefined
        ? { presentations: dto.presentations }
        : {}),
    });
    return toResponseDto(record);
  }

  async updateEducationRecord(
    idValue: string,
    dto: UpdateEducationDto,
  ): Promise<EducationResponseDto> {
    const id = parseId(idValue);
    const updates: Record<string, unknown> = {};
    if (dto.type !== undefined) {
      updates.type = dto.type;
    }
    if (dto.startDate !== undefined) {
      updates.startDate = asDate(dto.startDate);
    }
    if (dto.endDate !== undefined) {
      updates.endDate = asDate(dto.endDate);
    }
    if (dto.displayOrder !== undefined) {
      updates.displayOrder = dto.displayOrder;
    }
    flattenSet(updates, 'presentations', dto.presentations);

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException(
        'At least one education record value is required.',
      );
    }

    const currentRecord = await this.education.findOne({ _id: id }).exec();
    if (!currentRecord) {
      throw new NotFoundException('Education record not found.');
    }

    const current = currentRecord.toObject();
    validateDateRange(
      dto.startDate ?? current.startDate,
      dto.endDate ?? current.endDate,
    );

    const updatedRecord = await this.education
      .findOneAndUpdate(
        { _id: id },
        { $set: updates },
        { new: true, runValidators: true },
      )
      .exec();
    if (!updatedRecord) {
      throw new NotFoundException('Education record not found.');
    }

    return toResponseDto(updatedRecord);
  }

  async deleteEducationRecord(idValue: string): Promise<void> {
    const id = parseId(idValue);
    const deleted = await this.education.findOneAndDelete({ _id: id }).exec();
    if (!deleted) {
      throw new NotFoundException('Education record not found.');
    }
  }

  async updateDraft(
    idValue: string,
    localeValue: string,
    dto: UpdateEducationDraftDto,
  ): Promise<EducationResponseDto> {
    const id = parseId(idValue);
    const locale = parseLocale(localeValue);
    const updates: Record<string, unknown> = {};
    flattenSet(updates, `draft.${locale}`, dto);
    if (Object.keys(updates).length === 0) {
      throw new BadRequestException(
        'At least one education draft value must be provided.',
      );
    }

    const currentRecord = await this.education.findOne({ _id: id }).exec();
    if (!currentRecord) {
      throw new NotFoundException('Education record not found.');
    }

    const current = currentRecord.toObject();
    const mergedDraft = mergeContent(current.draft?.[locale], dto);
    await this.validateDraft(id, current.type, locale, mergedDraft);

    const updatedRecord = await this.education
      .findOneAndUpdate(
        { _id: id },
        { $set: updates },
        { new: true, runValidators: true },
      )
      .exec();
    if (!updatedRecord) {
      throw new NotFoundException('Education record not found.');
    }

    return toResponseDto(updatedRecord);
  }

  async publishLocale(
    idValue: string,
    localeValue: string,
  ): Promise<EducationResponseDto> {
    const id = parseId(idValue);
    const locale = parseLocale(localeValue);
    const currentRecord = await this.education.findOne({ _id: id }).exec();
    if (!currentRecord) {
      throw new NotFoundException('Education record not found.');
    }

    const current = currentRecord.toObject();
    const draft = current.draft?.[locale];
    if (!draft || !hasContent(draft)) {
      throw new ConflictException(
        'A valid education draft is required before publishing.',
      );
    }

    try {
      await this.validateDraft(id, current.type, locale, draft);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new ConflictException(
          'A valid education draft is required before publishing.',
        );
      }
      throw error;
    }

    const operation = createPublishLocaleUpdate(locale);
    const draftPath = `draft.${locale}`;
    const publishQuery = this.education.findOneAndUpdate(
      { _id: id, ...operation.filter },
      operation.pipeline,
      { new: true, ...operation.options },
    );
    if (typeof publishQuery.setQuery === 'function') {
      publishQuery.setQuery({
        _id: id,
        $and: [
          operation.filter,
          { [draftPath]: { $eq: draft } },
        ],
      });
    }

    const updatedRecord = await publishQuery.exec();
    if (!updatedRecord) {
      throw new ConflictException(
        'A valid education draft is required before publishing.',
      );
    }

    return toResponseDto(updatedRecord);
  }

  private async validateDraft(
    _id: string,
    type: EducationType,
    locale: Locale,
    content: NonNullable<Education['draft']>[Locale],
  ): Promise<void> {
    const draft: NonNullable<Education['draft']> = { [locale]: content };
    const candidate = new this.education({ type, draft });

    try {
      await candidate.validate();
    } catch (error) {
      if (error instanceof MongooseError.ValidationError) {
        throw new BadRequestException('Education draft is invalid.');
      }

      throw error;
    }
  }
}
