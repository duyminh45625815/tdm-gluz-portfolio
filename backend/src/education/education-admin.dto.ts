import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import type { Locale } from '../common/localization.types.js';
import {
  EDUCATION_TYPES,
  type Education,
  type EducationContent,
  type EducationType,
} from './education.schema.js';

export class EducationContentDto implements EducationContent {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(500)
  institution?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(500)
  title?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(500)
  degree?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(500)
  major?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(500)
  status?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(10_000)
  description?: string;
}

export class EducationPresentationsDto
  implements NonNullable<Education['presentations']>
{
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  home?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  about?: boolean;
}

export class CreateEducationDto {
  @IsIn(EDUCATION_TYPES)
  type!: EducationType;

  @ValidateIf((_object, value) => value !== undefined)
  @IsDateString()
  startDate?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsDateString()
  endDate?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => EducationPresentationsDto)
  presentations?: EducationPresentationsDto;
}

export class UpdateEducationDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(EDUCATION_TYPES)
  type?: EducationType;

  @ValidateIf((_object, value) => value !== undefined)
  @IsDateString()
  startDate?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsDateString()
  endDate?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => EducationPresentationsDto)
  presentations?: EducationPresentationsDto;
}

export class UpdateEducationDraftDto extends EducationContentDto {}

export interface EducationResponseDto {
  id: string;
  type: EducationType;
  draft?: Partial<Record<Locale, EducationContent>>;
  published?: Partial<Record<Locale, EducationContent>>;
  startDate?: Date;
  endDate?: Date;
  presentations?: Education['presentations'];
  displayOrder: number;
}
