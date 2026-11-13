import type { Locale } from '../common/localization.types.js';
import type {
  Project,
  ProjectCategory,
  ProjectContent,
} from './project.schema.js';

export interface PublicProjectResponseDto {
  slug: string;
  category: ProjectCategory;
  locale: Locale;
  content: ProjectContent;
  links?: Project['links'];
  presentations?: Project['presentations'];
  displayOrder: number;
}
