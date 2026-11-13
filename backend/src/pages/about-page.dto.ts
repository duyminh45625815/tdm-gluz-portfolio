import { Type } from 'class-transformer';
import {
  IsObject,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import type { Locale } from '../common/localization.types.js';
import {
  ContentSectionDto,
  HeroSectionDto,
  PageMetadataDto,
} from './home-page.dto.js';
import type { AboutPageContent } from './page.schema.js';

export class AboutPageContentDto implements AboutPageContent {
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
  @Type(() => ContentSectionDto)
  story?: ContentSectionDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => ContentSectionDto)
  education?: ContentSectionDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => ContentSectionDto)
  areas?: ContentSectionDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => ContentSectionDto)
  knowledge?: ContentSectionDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => ContentSectionDto)
  projects?: ContentSectionDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => ContentSectionDto)
  approach?: ContentSectionDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => ContentSectionDto)
  beyond?: ContentSectionDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => ContentSectionDto)
  closing?: ContentSectionDto;
}

export interface AboutPageResponseDto {
  slug: 'about';
  draft?: Partial<Record<Locale, AboutPageContent>>;
  published?: Partial<Record<Locale, AboutPageContent>>;
}
