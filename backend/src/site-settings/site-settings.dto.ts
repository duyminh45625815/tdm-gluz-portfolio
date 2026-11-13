import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsDefined,
  IsArray,
  IsEmail,
  IsIn,
  IsObject,
  IsString,
  MaxLength,
  Validate,
  ValidateIf,
  ValidateNested,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import {
  SUPPORTED_LOCALES,
  type Locale,
  type LocalizedText,
} from '../common/localization.types.js';
import type {
  ContactSettings,
  LocalizationSettings,
  SiteIdentity,
} from './site-settings.schema.js';

const SAFE_MAP_KEY = /^[A-Za-z0-9_-]{1,64}$/;
const RESERVED_MAP_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_MAP_ENTRIES = 50;

function isSafeMapKey(key: string): boolean {
  return SAFE_MAP_KEY.test(key) && !RESERVED_MAP_KEYS.has(key);
}

@ValidatorConstraint({ name: 'safeMapKeys', async: false })
class SafeLocalizedTextMapConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown): boolean {
    const supportedLocales = new Set<string>(SUPPORTED_LOCALES);

    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.entries(value).length <= MAX_MAP_ENTRIES &&
      Object.entries(value).every(
        ([key, localizedText]) =>
          isSafeMapKey(key) &&
          typeof localizedText === 'object' &&
          localizedText !== null &&
          !Array.isArray(localizedText) &&
          Object.entries(localizedText).every(
            ([locale, text]) =>
              supportedLocales.has(locale) &&
              typeof text === 'string' &&
              text.length <= 2000,
          ),
      )
    );
  }

  defaultMessage(): string {
    return 'Translations must use safe keys and supported locales with text of at most 2000 characters.';
  }
}

@ValidatorConstraint({ name: 'safeStringMap', async: false })
class SafeStringMapConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.entries(value).length <= MAX_MAP_ENTRIES &&
      Object.entries(value).every(
        ([key, item]) =>
          isSafeMapKey(key) &&
          typeof item === 'string' &&
          item.length <= 2048,
      )
    );
  }

  defaultMessage(): string {
    return 'Map values must be strings of at most 2048 characters.';
  }
}

export class LocalizedTextDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  vi?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  en?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  ja?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  ko?: string;
}

export class SiteIdentityDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name?: LocalizedTextDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title?: LocalizedTextDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  tagline?: LocalizedTextDto;
}

export class ContactSettingsDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(64)
  phone?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  location?: LocalizedTextDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @Validate(SafeStringMapConstraint)
  socialLinks?: Record<string, string>;
}

export class CreateLocalizationSettingsDto {
  @IsIn(SUPPORTED_LOCALES)
  defaultLocale!: Locale;

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMinSize(SUPPORTED_LOCALES.length)
  @ArrayMaxSize(SUPPORTED_LOCALES.length)
  @ArrayUnique()
  @IsIn(SUPPORTED_LOCALES, { each: true })
  supportedLocales?: Locale[];
}

export class UpdateLocalizationSettingsDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(SUPPORTED_LOCALES)
  defaultLocale?: Locale;

  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMinSize(SUPPORTED_LOCALES.length)
  @ArrayMaxSize(SUPPORTED_LOCALES.length)
  @ArrayUnique()
  @IsIn(SUPPORTED_LOCALES, { each: true })
  supportedLocales?: Locale[];
}

export class SiteTranslationsDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @Validate(SafeLocalizedTextMapConstraint)
  navigation?: Record<string, LocalizedTextDto>;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @Validate(SafeLocalizedTextMapConstraint)
  footer?: Record<string, LocalizedTextDto>;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @Validate(SafeLocalizedTextMapConstraint)
  shared?: Record<string, LocalizedTextDto>;
}

export class CreateSiteSettingsDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => SiteIdentityDto)
  identity?: SiteIdentityDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => ContactSettingsDto)
  contact?: ContactSettingsDto;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateLocalizationSettingsDto)
  localization!: CreateLocalizationSettingsDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => SiteTranslationsDto)
  translations?: SiteTranslationsDto;
}

export class UpdateSiteSettingsDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => SiteIdentityDto)
  identity?: SiteIdentityDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => ContactSettingsDto)
  contact?: ContactSettingsDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateLocalizationSettingsDto)
  localization?: UpdateLocalizationSettingsDto;

  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => SiteTranslationsDto)
  translations?: SiteTranslationsDto;
}

export interface SiteSettingsResponseDto {
  identity?: SiteIdentity;
  contact?: Omit<ContactSettings, 'socialLinks'> & {
    socialLinks?: Record<string, string>;
  };
  localization: LocalizationSettings;
  translations?: {
    navigation?: Record<string, LocalizedText>;
    footer?: Record<string, LocalizedText>;
    shared?: Record<string, LocalizedText>;
  };
}
