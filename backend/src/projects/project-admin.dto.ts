import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  PROJECT_CATEGORIES,
  type Project,
  type ProjectCategory,
} from './project.schema.js';

const MAX_TEXT_LENGTH = 10_000;

export class ProjectContentDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(500)
  title?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(1000)
  subtitle?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(MAX_TEXT_LENGTH)
  description?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  deliverables?: string[];

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(1000)
  role?: string;
}

export class ProjectLinksDto implements NonNullable<Project['links']> {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(2048)
  github?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(2048)
  demo?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(2048)
  figma?: string;
}

export class ProjectPresentationsDto
  implements NonNullable<Project['presentations']>
{
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  home?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  about?: boolean;
}

export class CreateProjectDto
  implements Pick<Project, 'slug' | 'category'>
{
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @IsIn(PROJECT_CATEGORIES)
  category!: ProjectCategory;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => ProjectLinksDto)
  links?: ProjectLinksDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => ProjectPresentationsDto)
  presentations?: ProjectPresentationsDto;
}

export class UpdateProjectDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(PROJECT_CATEGORIES)
  category?: ProjectCategory;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => ProjectLinksDto)
  links?: ProjectLinksDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => ProjectPresentationsDto)
  presentations?: ProjectPresentationsDto;
}

export class UpdateProjectDraftDto extends ProjectContentDto {}

export interface ProjectResponseDto {
  slug: string;
  category: ProjectCategory;
  draft?: Project['draft'];
  published?: Project['published'];
  links?: Project['links'];
  presentations?: Project['presentations'];
  displayOrder: number;
}
