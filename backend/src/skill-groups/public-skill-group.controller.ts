import { Controller, Get, Query } from '@nestjs/common';
import type { PublicSkillGroupResponseDto } from './public-skill-group.dto.js';
import { PublicSkillGroupService } from './public-skill-group.service.js';

@Controller('public/skill-groups')
export class PublicSkillGroupController {
  constructor(
    private readonly publicSkillGroupService: PublicSkillGroupService,
  ) {}

  @Get()
  getSkillGroups(
    @Query('locale') locale?: string,
    @Query('presentation') presentation?: string,
  ): Promise<PublicSkillGroupResponseDto[]> {
    return this.publicSkillGroupService.getSkillGroups(locale, presentation);
  }
}
