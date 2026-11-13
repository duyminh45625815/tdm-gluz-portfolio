import type { Locale } from '../common/localization.types.js';
import type {
  Education,
  EducationContent,
  EducationType,
} from './education.schema.js';

export interface PublicEducationResponseDto {
  id: string;
  type: EducationType;
  locale: Locale;
  content: EducationContent;
  startDate?: Date;
  endDate?: Date;
  presentations?: Education['presentations'];
  displayOrder: number;
}
