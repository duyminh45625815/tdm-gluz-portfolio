import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { Locale } from '../common/localization.types.js';
import {
  isPresented,
  presentationFilter,
  resolvePresentation,
} from '../common/public-presentation.utils.js';
import { selectPublishedContent } from '../common/public-localization.utils.js';
import { PublicLocaleService } from '../site-settings/public-locale.service.js';
import {
  PROJECT_MODEL,
  type Project,
  type ProjectContent,
  type ProjectDocument,
} from './project.schema.js';
import type { PublicProjectResponseDto } from './public-project.dto.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parseSlug(value: string): string {
  if (!SLUG_PATTERN.test(value)) {
    throw new BadRequestException('Invalid project slug.');
  }
  return value;
}

function publishedFilter(
  locale: Locale,
  fallbackLocale: Locale,
): Record<string, unknown> {
  if (locale === fallbackLocale) {
    return { [`published.${locale}`]: { $type: 'object' } };
  }

  return {
    $or: [
      { [`published.${locale}`]: { $type: 'object' } },
      { [`published.${fallbackLocale}`]: { $type: 'object' } },
    ],
  };
}

function toResponse(
  document: ProjectDocument,
  locale: Locale,
  content: ProjectContent,
): PublicProjectResponseDto {
  const project = document.toObject();

  return {
    slug: project.slug,
    category: project.category,
    locale,
    content,
    links: project.links
      ? {
          github: project.links.github,
          demo: project.links.demo,
          figma: project.links.figma,
        }
      : undefined,
    presentations: project.presentations
      ? {
          home: project.presentations.home,
          about: project.presentations.about,
        }
      : undefined,
    displayOrder: project.displayOrder,
  };
}

@Injectable()
export class PublicProjectService {
  constructor(
    @InjectModel(PROJECT_MODEL)
    private readonly projects: Model<Project>,
    private readonly publicLocaleService: PublicLocaleService,
  ) {}

  async getProjects(
    localeValue?: string,
    presentationValue?: string,
  ): Promise<PublicProjectResponseDto[]> {
    const selection = await this.publicLocaleService.resolve(localeValue);
    const presentation = resolvePresentation(presentationValue);
    const projects = await this.projects
      .find({
        $and: [
          presentationFilter(presentation),
          publishedFilter(selection.locale, selection.fallbackLocale),
        ],
      })
      .sort({ displayOrder: 1, slug: 1 })
      .exec();

    return projects.flatMap((project) => {
      const data = project.toObject();
      if (!isPresented(data.presentations, presentation)) {
        return [];
      }

      const selected = selectPublishedContent(data.published, selection);
      return selected
        ? [toResponse(project, selected.locale, selected.content)]
        : [];
    });
  }

  async getProject(
    slugValue: string,
    localeValue?: string,
    presentationValue?: string,
  ): Promise<PublicProjectResponseDto> {
    const slug = parseSlug(slugValue);
    const selection = await this.publicLocaleService.resolve(localeValue);
    const presentation = resolvePresentation(presentationValue);
    const project = await this.projects
      .findOne({
        slug,
        $and: [
          presentationFilter(presentation),
          publishedFilter(selection.locale, selection.fallbackLocale),
        ],
      })
      .exec();
    if (!project) {
      throw new NotFoundException('Published project not found.');
    }

    const data = project.toObject();
    const selected = selectPublishedContent(data.published, selection);
    if (!isPresented(data.presentations, presentation) || !selected) {
      throw new NotFoundException('Published project not found.');
    }

    return toResponse(project, selected.locale, selected.content);
  }
}
