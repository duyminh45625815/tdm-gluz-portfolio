import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import {
  SUPPORTED_LOCALES,
  type Locale,
} from '../common/localization.types.js';
import {
  SITE_SETTINGS_MODEL,
  type ContactSettings,
  type SiteSettings,
  type SiteSettingsDocument,
} from './site-settings.schema.js';
import type {
  CreateSiteSettingsDto,
  SiteSettingsResponseDto,
  UpdateSiteSettingsDto,
} from './site-settings.dto.js';

const SINGLETON_FILTER = { key: 'main' } as const;

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  );
}

function setLocalizedText(
  updates: Record<string, unknown>,
  path: string,
  value: Partial<Record<Locale, string>> | undefined,
): void {
  if (!value) {
    return;
  }

  for (const locale of SUPPORTED_LOCALES) {
    const localizedValue = value[locale];
    if (localizedValue !== undefined) {
      updates[`${path}.${locale}`] = localizedValue;
    }
  }
}

function setLocalizedRecord(
  updates: Record<string, unknown>,
  path: string,
  values: Record<string, Partial<Record<Locale, string>>> | undefined,
): void {
  if (!values) {
    return;
  }

  for (const [key, localizedText] of Object.entries(values)) {
    setLocalizedText(updates, `${path}.${key}`, localizedText);
  }
}

function toResponseDto(
  document: SiteSettingsDocument,
): SiteSettingsResponseDto {
  const settings = document.toObject({ flattenMaps: true });

  return {
    identity: settings.identity,
    contact: settings.contact,
    localization: settings.localization,
    translations: settings.translations,
  };
}

function toContactSettings(
  contact: CreateSiteSettingsDto['contact'],
): ContactSettings | undefined {
  if (!contact) {
    return undefined;
  }

  return {
    email: contact.email,
    phone: contact.phone,
    location: contact.location,
    socialLinks: contact.socialLinks
      ? new Map(Object.entries(contact.socialLinks))
      : undefined,
  };
}

function toTranslations(
  translations: CreateSiteSettingsDto['translations'],
): SiteSettings['translations'] {
  if (!translations) {
    return undefined;
  }

  return {
    navigation: translations.navigation
      ? new Map(Object.entries(translations.navigation))
      : undefined,
    footer: translations.footer
      ? new Map(Object.entries(translations.footer))
      : undefined,
    shared: translations.shared
      ? new Map(Object.entries(translations.shared))
      : undefined,
  };
}

@Injectable()
export class SiteSettingsService {
  constructor(
    @InjectModel(SITE_SETTINGS_MODEL)
    private readonly siteSettings: Model<SiteSettings>,
  ) {}

  async getCurrent(): Promise<SiteSettingsResponseDto> {
    const settings = await this.siteSettings.findOne(SINGLETON_FILTER).exec();
    if (!settings) {
      throw new NotFoundException('Site settings have not been created.');
    }

    return toResponseDto(settings);
  }

  async create(
    dto: CreateSiteSettingsDto,
  ): Promise<SiteSettingsResponseDto> {
    await this.siteSettings.init();
    const existing = await this.siteSettings.exists(SINGLETON_FILTER).exec();
    if (existing) {
      throw new ConflictException('Site settings already exist.');
    }

    const settings: SiteSettings = {
      key: 'main',
      identity: dto.identity,
      contact: toContactSettings(dto.contact),
      localization: {
        defaultLocale: dto.localization.defaultLocale,
        supportedLocales:
          dto.localization.supportedLocales ?? [...SUPPORTED_LOCALES],
      },
      translations: toTranslations(dto.translations),
    };

    try {
      return toResponseDto(await this.siteSettings.create(settings));
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('Site settings already exist.');
      }

      throw error;
    }
  }

  async update(
    dto: UpdateSiteSettingsDto,
  ): Promise<SiteSettingsResponseDto> {
    const updates: Record<string, unknown> = {};

    if (dto.identity) {
      setLocalizedText(updates, 'identity.name', dto.identity.name);
      setLocalizedText(updates, 'identity.title', dto.identity.title);
      setLocalizedText(updates, 'identity.tagline', dto.identity.tagline);
    }

    if (dto.contact) {
      if (dto.contact.email !== undefined) {
        updates['contact.email'] = dto.contact.email;
      }
      if (dto.contact.phone !== undefined) {
        updates['contact.phone'] = dto.contact.phone;
      }
      setLocalizedText(updates, 'contact.location', dto.contact.location);
      for (const [key, value] of Object.entries(
        dto.contact.socialLinks ?? {},
      )) {
        updates[`contact.socialLinks.${key}`] = value;
      }
    }

    if (dto.localization?.defaultLocale !== undefined) {
      updates['localization.defaultLocale'] = dto.localization.defaultLocale;
    }
    if (dto.localization?.supportedLocales !== undefined) {
      updates['localization.supportedLocales'] =
        dto.localization.supportedLocales;
    }

    if (dto.translations) {
      setLocalizedRecord(
        updates,
        'translations.navigation',
        dto.translations.navigation,
      );
      setLocalizedRecord(
        updates,
        'translations.footer',
        dto.translations.footer,
      );
      setLocalizedRecord(
        updates,
        'translations.shared',
        dto.translations.shared,
      );
    }

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException(
        'At least one site settings value must be provided.',
      );
    }

    const settings = await this.siteSettings
      .findOneAndUpdate(
        SINGLETON_FILTER,
        { $set: updates },
        { new: true, runValidators: true },
      )
      .exec();

    if (!settings) {
      throw new NotFoundException('Site settings have not been created.');
    }

    return toResponseDto(settings);
  }
}
