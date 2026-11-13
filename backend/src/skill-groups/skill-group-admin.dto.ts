import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import type { Locale } from '../common/localization.types.js';
import type { SkillGroup, SkillGroupContent } from './skill-group.schema.js';

export class SkillItemsContentDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(500)
  title?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  items?: string[];
}

export class SkillGroupContentDto implements SkillGroupContent {
  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => SkillItemsContentDto)
  home?: SkillItemsContentDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => SkillItemsContentDto)
  about?: SkillItemsContentDto;
}

export class SkillGroupPresentationsDto
  implements NonNullable<SkillGroup['presentations']>
{
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  home?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  about?: boolean;
}

export class CreateSkillGroupDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  key!: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => SkillGroupPresentationsDto)
  presentations?: SkillGroupPresentationsDto;
}

export class UpdateSkillGroupDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => SkillGroupPresentationsDto)
  presentations?: SkillGroupPresentationsDto;
}

export class UpdateSkillGroupDraftDto extends SkillGroupContentDto {}

export interface SkillGroupResponseDto {
  key: string;
  draft?: Partial<Record<Locale, SkillGroupContent>>;
  published?: Partial<Record<Locale, SkillGroupContent>>;
  presentations?: SkillGroup['presentations'];
  displayOrder: number;
}
