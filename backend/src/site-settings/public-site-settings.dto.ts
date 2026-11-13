import type { LocalizedText } from '../common/localization.types.js';
import type {
  LocalizationSettings,
  SiteIdentity,
} from './site-settings.schema.js';

export interface PublicSiteSettingsResponseDto {
  identity?: SiteIdentity;
  contact?: {
    email?: string;
    phone?: string;
    location?: LocalizedText;
    socialLinks?: Record<string, string>;
  };
  localization: LocalizationSettings;
  translations?: {
    navigation?: Record<string, LocalizedText>;
    footer?: Record<string, LocalizedText>;
    shared?: Record<string, LocalizedText>;
  };
}
