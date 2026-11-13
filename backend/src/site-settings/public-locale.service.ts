import { BadRequestException, Injectable } from '@nestjs/common';
import {
  SUPPORTED_LOCALES,
  type Locale,
} from '../common/localization.types.js';
import type { PublicLocaleSelection } from '../common/public-localization.utils.js';
import { SiteSettingsService } from './site-settings.service.js';

@Injectable()
export class PublicLocaleService {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

  async resolve(localeValue?: string): Promise<PublicLocaleSelection> {
    const { localization } = await this.siteSettingsService.getCurrent();
    const fallbackLocale = localization.defaultLocale;

    if (localeValue === undefined) {
      return { locale: fallbackLocale, fallbackLocale };
    }

    if (!(SUPPORTED_LOCALES as readonly string[]).includes(localeValue)) {
      throw new BadRequestException('Unsupported locale.');
    }

    return { locale: localeValue as Locale, fallbackLocale };
  }
}
