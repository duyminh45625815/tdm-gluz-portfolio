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
  SKILL_GROUP_MODEL,
  type SkillGroup,
  type SkillGroupDocument,
} from './skill-group.schema.js';
import {
  type CreateSkillGroupDto,
  type SkillGroupResponseDto,
  type UpdateSkillGroupDraftDto,
  type UpdateSkillGroupDto,
} from './skill-group-admin.dto.js';

const SKILL_GROUP_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

function parseKey(value: string): string {
  if (!SKILL_GROUP_KEY_PATTERN.test(value)) {
    throw new BadRequestException('Invalid skill group key.');
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

function toResponseDto(
  document: SkillGroupDocument,
): SkillGroupResponseDto {
  const skillGroup = document.toObject();

  return {
    key: skillGroup.key,
    draft: skillGroup.draft,
    published: skillGroup.published,
    presentations: skillGroup.presentations,
    displayOrder: skillGroup.displayOrder,
  };
}

@Injectable()
export class SkillGroupAdminService {
  constructor(
    @InjectModel(SKILL_GROUP_MODEL)
    private readonly skillGroups: Model<SkillGroup>,
  ) {}

  async getSkillGroups(): Promise<SkillGroupResponseDto[]> {
    const skillGroups = await this.skillGroups
      .find({})
      .sort({ displayOrder: 1, key: 1 })
      .exec();
    return skillGroups.map(toResponseDto);
  }

  async getSkillGroup(keyValue: string): Promise<SkillGroupResponseDto> {
    const key = parseKey(keyValue);
    const skillGroup = await this.skillGroups.findOne({ key }).exec();
    if (!skillGroup) {
      throw new NotFoundException('Skill group not found.');
    }

    return toResponseDto(skillGroup);
  }

  async createSkillGroup(
    dto: CreateSkillGroupDto,
  ): Promise<SkillGroupResponseDto> {
    await this.skillGroups.init();
    try {
      return toResponseDto(await this.skillGroups.create(dto));
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('Skill group key already exists.');
      }

      throw error;
    }
  }

  async updateSkillGroup(
    keyValue: string,
    dto: UpdateSkillGroupDto,
  ): Promise<SkillGroupResponseDto> {
    const key = parseKey(keyValue);
    const updates: Record<string, unknown> = {};
    if (dto.displayOrder !== undefined) {
      updates.displayOrder = dto.displayOrder;
    }
    flattenSet(updates, 'presentations', dto.presentations);

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException(
        'At least one skill group value is required.',
      );
    }

    const skillGroup = await this.skillGroups
      .findOneAndUpdate(
        { key },
        { $set: updates },
        { new: true, runValidators: true },
      )
      .exec();
    if (!skillGroup) {
      throw new NotFoundException('Skill group not found.');
    }

    return toResponseDto(skillGroup);
  }

  async deleteSkillGroup(keyValue: string): Promise<void> {
    const key = parseKey(keyValue);
    const deleted = await this.skillGroups.findOneAndDelete({ key }).exec();
    if (!deleted) {
      throw new NotFoundException('Skill group not found.');
    }
  }

  async updateDraft(
    keyValue: string,
    localeValue: string,
    dto: UpdateSkillGroupDraftDto,
  ): Promise<SkillGroupResponseDto> {
    const key = parseKey(keyValue);
    const locale = parseLocale(localeValue);
    const updates: Record<string, unknown> = {};
    flattenSet(updates, `draft.${locale}`, dto);
    if (Object.keys(updates).length === 0) {
      throw new BadRequestException(
        'At least one skill group draft value must be provided.',
      );
    }

    const currentSkillGroup = await this.skillGroups.findOne({ key }).exec();
    if (!currentSkillGroup) {
      throw new NotFoundException('Skill group not found.');
    }

    const currentDraft = currentSkillGroup.toObject().draft?.[locale];
    const mergedDraft = mergeContent(currentDraft, dto);
    await this.validateDraft(key, locale, mergedDraft);

    const updatedSkillGroup = await this.skillGroups
      .findOneAndUpdate(
        { key },
        { $set: updates },
        { new: true, runValidators: true },
      )
      .exec();
    if (!updatedSkillGroup) {
      throw new NotFoundException('Skill group not found.');
    }

    return toResponseDto(updatedSkillGroup);
  }

  async publishLocale(
    keyValue: string,
    localeValue: string,
  ): Promise<SkillGroupResponseDto> {
    const key = parseKey(keyValue);
    const locale = parseLocale(localeValue);
    const currentSkillGroup = await this.skillGroups.findOne({ key }).exec();
    if (!currentSkillGroup) {
      throw new NotFoundException('Skill group not found.');
    }

    const draft = currentSkillGroup.toObject().draft?.[locale];
    if (!draft || !hasContent(draft)) {
      throw new ConflictException(
        'A valid skill group draft is required before publishing.',
      );
    }

    try {
      await this.validateDraft(key, locale, draft);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new ConflictException(
          'A valid skill group draft is required before publishing.',
        );
      }
      throw error;
    }

    const operation = createPublishLocaleUpdate(locale);
    const draftPath = `draft.${locale}`;
    const publishQuery = this.skillGroups.findOneAndUpdate(
      { key, ...operation.filter },
      operation.pipeline,
      { new: true, ...operation.options },
    );
    if (typeof publishQuery.setQuery === 'function') {
      publishQuery.setQuery({
        key,
        $and: [
          operation.filter,
          { [draftPath]: { $eq: draft } },
        ],
      });
    }

    const updatedSkillGroup = await publishQuery.exec();
    if (!updatedSkillGroup) {
      throw new ConflictException(
        'A valid skill group draft is required before publishing.',
      );
    }

    return toResponseDto(updatedSkillGroup);
  }

  private async validateDraft(
    key: string,
    locale: Locale,
    content: NonNullable<SkillGroup['draft']>[Locale],
  ): Promise<void> {
    const draft: NonNullable<SkillGroup['draft']> = { [locale]: content };
    const candidate = new this.skillGroups({ key, draft });

    try {
      await candidate.validate();
    } catch (error) {
      if (error instanceof MongooseError.ValidationError) {
        throw new BadRequestException('Skill group draft is invalid.');
      }

      throw error;
    }
  }
}
