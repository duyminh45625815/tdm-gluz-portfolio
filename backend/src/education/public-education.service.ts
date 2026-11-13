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
  EDUCATION_MODEL,
  type Education,
  type EducationContent,
  type EducationDocument,
} from './education.schema.js';
import type { PublicEducationResponseDto } from './public-education.dto.js';

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
  document: EducationDocument,
  locale: Locale,
  content: EducationContent,
): PublicEducationResponseDto {
  const education = document.toObject();

  return {
    id: education._id.toString(),
    type: education.type,
    locale,
    content,
    startDate: education.startDate,
    endDate: education.endDate,
    presentations: education.presentations
      ? {
          home: education.presentations.home,
          about: education.presentations.about,
        }
      : undefined,
    displayOrder: education.displayOrder,
  };
}

@Injectable()
export class PublicEducationService {
  constructor(
    @InjectModel(EDUCATION_MODEL)
    private readonly education: Model<Education>,
    private readonly publicLocaleService: PublicLocaleService,
  ) {}

  async getEducationRecords(
    localeValue?: string,
    presentationValue?: string,
  ): Promise<PublicEducationResponseDto[]> {
    const selection = await this.publicLocaleService.resolve(localeValue);
    const presentation = resolvePresentation(presentationValue);
    const records = await this.education
      .find({
        $and: [
          presentationFilter(presentation),
          publishedFilter(selection.locale, selection.fallbackLocale),
        ],
      })
      .sort({ type: 1, displayOrder: 1, _id: 1 })
      .exec();

    return records.flatMap((record) => {
      const data = record.toObject();
      if (!isPresented(data.presentations, presentation)) {
        return [];
      }

      const selected = selectPublishedContent(data.published, selection);
      return selected
        ? [toResponse(record, selected.locale, selected.content)]
        : [];
    });
  }
}
