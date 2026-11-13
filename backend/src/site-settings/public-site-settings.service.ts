import { Injectable } from '@nestjs/common';
import type { LocalizedText } from '../common/localization.types.js';
import type { SiteSettingsResponseDto } from './site-settings.dto.js';
import type { PublicSiteSettingsResponseDto } from './public-site-settings.dto.js';
import { SiteSettingsService } from './site-settings.service.js';

function copyLocalizedText(
  value: LocalizedText | undefined,
): LocalizedText | undefined {
  if (!value) {
    return undefined;
  }

  return {
    vi: value.vi,
    en: value.en,
    ja: value.ja,
    ko: value.ko,
  };
}

function copyLocalizedMap(
  values: Record<string, LocalizedText> | undefined,
): Record<string, LocalizedText> | undefined {
  if (!values) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      copyLocalizedText(value) ?? {},
    ]),
  );
}

function toPublicResponse(
  settings: SiteSettingsResponseDto,
): PublicSiteSettingsResponseDto {
  return {
    identity: settings.identity
      ? {
          name: copyLocalizedText(settings.identity.name),
          title: copyLocalizedText(settings.identity.title),
          tagline: copyLocalizedText(settings.identity.tagline),
        }
      : undefined,
    contact: settings.contact
      ? {
          email: settings.contact.email,
          phone: settings.contact.phone,
          location: copyLocalizedText(settings.contact.location),
          socialLinks: settings.contact.socialLinks
            ? Object.fromEntries(
                Object.entries(settings.contact.socialLinks),
              )
            : undefined,
        }
      : undefined,
    localization: {
      defaultLocale: settings.localization.defaultLocale,
      supportedLocales: [...settings.localization.supportedLocales],
    },
    translations: settings.translations
      ? {
          navigation: copyLocalizedMap(settings.translations.navigation),
          footer: copyLocalizedMap(settings.translations.footer),
          shared: copyLocalizedMap(settings.translations.shared),
        }
      : undefined,
  };
}

@Injectable()
export class PublicSiteSettingsService {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

  async getPublicSettings(): Promise<PublicSiteSettingsResponseDto> {
    return toPublicResponse(await this.siteSettingsService.getCurrent());
  }
}
