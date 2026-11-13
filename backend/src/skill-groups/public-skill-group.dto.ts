import type { Locale } from '../common/localization.types.js';
import type { SkillGroup, SkillGroupContent } from './skill-group.schema.js';

export interface PublicSkillGroupResponseDto {
  key: string;
  locale: Locale;
  content: SkillGroupContent;
  presentations?: SkillGroup['presentations'];
  displayOrder: number;
}
