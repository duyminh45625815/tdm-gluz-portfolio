import type { Locale } from '../common/localization.types.js';
import type { AboutPageContent, HomePageContent } from './page.schema.js';

export interface PublicHomePageResponseDto {
  slug: 'home';
  locale: Locale;
  content: HomePageContent;
}

export interface PublicAboutPageResponseDto {
  slug: 'about';
  locale: Locale;
  content: AboutPageContent;
}
