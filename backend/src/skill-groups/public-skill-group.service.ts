import { Injectable } from '@nestjs/common';
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
  SKILL_GROUP_MODEL,
  type SkillGroup,
  type SkillGroupContent,
  type SkillGroupDocument,
} from './skill-group.schema.js';
import type { PublicSkillGroupResponseDto } from './public-skill-group.dto.js';

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
  document: SkillGroupDocument,
  locale: Locale,
  content: SkillGroupContent,
): PublicSkillGroupResponseDto {
  const skillGroup = document.toObject();

  return {
    key: skillGroup.key,
    locale,
    content,
    presentations: skillGroup.presentations
      ? {
          home: skillGroup.presentations.home,
          about: skillGroup.presentations.about,
        }
      : undefined,
    displayOrder: skillGroup.displayOrder,
  };
}

@Injectable()
export class PublicSkillGroupService {
  constructor(
    @InjectModel(SKILL_GROUP_MODEL)
    private readonly skillGroups: Model<SkillGroup>,
    private readonly publicLocaleService: PublicLocaleService,
  ) {}

  async getSkillGroups(
    localeValue?: string,
    presentationValue?: string,
  ): Promise<PublicSkillGroupResponseDto[]> {
    const selection = await this.publicLocaleService.resolve(localeValue);
    const presentation = resolvePresentation(presentationValue);
    const groups = await this.skillGroups
      .find({
        $and: [
          presentationFilter(presentation),
          publishedFilter(selection.locale, selection.fallbackLocale),
        ],
      })
      .sort({ displayOrder: 1, key: 1 })
      .exec();

    return groups.flatMap((group) => {
      const data = group.toObject();
      if (!isPresented(data.presentations, presentation)) {
        return [];
      }

      const selected = selectPublishedContent(data.published, selection);
      return selected
        ? [toResponse(group, selected.locale, selected.content)]
        : [];
    });
  }
}
