import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsObject,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import type { Locale } from '../common/localization.types.js';
import type { HomePageContent } from './page.schema.js';

const MAX_TEXT_LENGTH = 10_000;

export class PageMetadataDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(500)
  title?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(MAX_TEXT_LENGTH)
  description?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;
}

export class PageActionDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(500)
  label?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(2048)
  href?: string;
}

export class HeroSectionDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(500)
  eyebrow?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  title?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  subtitle?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(MAX_TEXT_LENGTH)
  description?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => PageActionDto)
  primaryAction?: PageActionDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => PageActionDto)
  secondaryAction?: PageActionDto;
}

export class ContentSectionDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(500)
  eyebrow?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  title?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  subtitle?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(MAX_TEXT_LENGTH)
  description?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(MAX_TEXT_LENGTH)
  body?: string;
}

export class HighlightItemDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(500)
  label?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(500)
  value?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(MAX_TEXT_LENGTH)
  description?: string;
}

export class HighlightsSectionDto extends ContentSectionDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => HighlightItemDto)
  items?: HighlightItemDto[];
}

export class HomePageContentDto implements HomePageContent {
  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => PageMetadataDto)
  metadata?: PageMetadataDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => HeroSectionDto)
  hero?: HeroSectionDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => HighlightsSectionDto)
  highlights?: HighlightsSectionDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => ContentSectionDto)
  about?: ContentSectionDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => ContentSectionDto)
  projects?: ContentSectionDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => ContentSectionDto)
  skills?: ContentSectionDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => ContentSectionDto)
  contact?: ContentSectionDto;
}

export interface HomePageResponseDto {
  slug: 'home';
  draft?: Partial<Record<Locale, HomePageContent>>;
  published?: Partial<Record<Locale, HomePageContent>>;
}
