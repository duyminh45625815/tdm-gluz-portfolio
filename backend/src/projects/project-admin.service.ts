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
  PROJECT_MODEL,
  type Project,
  type ProjectCategory,
  type ProjectDocument,
} from './project.schema.js';
import {
  type CreateProjectDto,
  type ProjectResponseDto,
  type UpdateProjectDraftDto,
  type UpdateProjectDto,
} from './project-admin.dto.js';

const PROJECT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

function parseSlug(value: string): string {
  if (!PROJECT_SLUG_PATTERN.test(value)) {
    throw new BadRequestException('Invalid project slug.');
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

function toResponseDto(document: ProjectDocument): ProjectResponseDto {
  const project = document.toObject();

  return {
    slug: project.slug,
    category: project.category,
    draft: project.draft,
    published: project.published,
    links: project.links,
    presentations: project.presentations,
    displayOrder: project.displayOrder,
  };
}

@Injectable()
export class ProjectAdminService {
  constructor(
    @InjectModel(PROJECT_MODEL)
    private readonly projects: Model<Project>,
  ) {}

  async getProjects(): Promise<ProjectResponseDto[]> {
    const projects = await this.projects
      .find({})
      .sort({ displayOrder: 1, slug: 1 })
      .exec();
    return projects.map(toResponseDto);
  }

  async getProject(slugValue: string): Promise<ProjectResponseDto> {
    const slug = parseSlug(slugValue);
    const project = await this.projects.findOne({ slug }).exec();
    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    return toResponseDto(project);
  }

  async createProject(dto: CreateProjectDto): Promise<ProjectResponseDto> {
    await this.projects.init();
    try {
      const project = await this.projects.create(dto);
      return toResponseDto(project);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('Project slug already exists.');
      }

      throw error;
    }
  }

  async updateProject(
    slugValue: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    const slug = parseSlug(slugValue);
    const updates: Record<string, unknown> = {};
    if (dto.category !== undefined) {
      updates.category = dto.category;
    }
    if (dto.displayOrder !== undefined) {
      updates.displayOrder = dto.displayOrder;
    }
    flattenSet(updates, 'links', dto.links);
    flattenSet(updates, 'presentations', dto.presentations);

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('At least one project value is required.');
    }

    const project = await this.projects
      .findOneAndUpdate(
        { slug },
        { $set: updates },
        { new: true, runValidators: true },
      )
      .exec();
    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    return toResponseDto(project);
  }

  async deleteProject(slugValue: string): Promise<void> {
    const slug = parseSlug(slugValue);
    const deleted = await this.projects.findOneAndDelete({ slug }).exec();
    if (!deleted) {
      throw new NotFoundException('Project not found.');
    }
  }

  async updateDraft(
    slugValue: string,
    localeValue: string,
    dto: UpdateProjectDraftDto,
  ): Promise<ProjectResponseDto> {
    const slug = parseSlug(slugValue);
    const locale = parseLocale(localeValue);
    const updates: Record<string, unknown> = {};
    flattenSet(updates, `draft.${locale}`, dto);
    if (Object.keys(updates).length === 0) {
      throw new BadRequestException(
        'At least one project draft value must be provided.',
      );
    }

    const currentProject = await this.projects.findOne({ slug }).exec();
    if (!currentProject) {
      throw new NotFoundException('Project not found.');
    }

    const projectData = currentProject.toObject();
    const mergedDraft = mergeContent(projectData.draft?.[locale], dto);
    await this.validateDraft(
      slug,
      projectData.category as ProjectCategory,
      locale,
      mergedDraft,
    );

    const updatedProject = await this.projects
      .findOneAndUpdate(
        { slug },
        { $set: updates },
        { new: true, runValidators: true },
      )
      .exec();
    if (!updatedProject) {
      throw new NotFoundException('Project not found.');
    }

    return toResponseDto(updatedProject);
  }

  async publishLocale(
    slugValue: string,
    localeValue: string,
  ): Promise<ProjectResponseDto> {
    const slug = parseSlug(slugValue);
    const locale = parseLocale(localeValue);
    const currentProject = await this.projects.findOne({ slug }).exec();
    if (!currentProject) {
      throw new NotFoundException('Project not found.');
    }

    const projectData = currentProject.toObject();
    const draft = projectData.draft?.[locale];
    if (!draft || !hasContent(draft)) {
      throw new ConflictException(
        'A valid project draft is required before publishing.',
      );
    }

    try {
      await this.validateDraft(
        slug,
        projectData.category as ProjectCategory,
        locale,
        draft,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new ConflictException(
          'A valid project draft is required before publishing.',
        );
      }
      throw error;
    }

    const operation = createPublishLocaleUpdate(locale);
    const draftPath = `draft.${locale}`;
    const publishQuery = this.projects.findOneAndUpdate(
      { slug, ...operation.filter },
      operation.pipeline,
      { new: true, ...operation.options },
    );
    if (typeof publishQuery.setQuery === 'function') {
      publishQuery.setQuery({
        slug,
        $and: [
          operation.filter,
          { [draftPath]: { $eq: draft } },
        ],
      });
    }

    const updatedProject = await publishQuery.exec();
    if (!updatedProject) {
      throw new ConflictException(
        'A valid project draft is required before publishing.',
      );
    }

    return toResponseDto(updatedProject);
  }

  private async validateDraft(
    slug: string,
    category: ProjectCategory,
    locale: Locale,
    content: NonNullable<Project['draft']>[Locale],
  ): Promise<void> {
    const draft: NonNullable<Project['draft']> = { [locale]: content };
    const candidate = new this.projects({ slug, category, draft });

    try {
      await candidate.validate();
    } catch (error) {
      if (error instanceof MongooseError.ValidationError) {
        throw new BadRequestException('Project draft is invalid.');
      }

      throw error;
    }
  }
}
