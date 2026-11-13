import { Controller, Get, Param, Query } from '@nestjs/common';
import type { PublicProjectResponseDto } from './public-project.dto.js';
import { PublicProjectService } from './public-project.service.js';

@Controller('public/projects')
export class PublicProjectController {
  constructor(private readonly publicProjectService: PublicProjectService) {}

  @Get()
  getProjects(
    @Query('locale') locale?: string,
    @Query('presentation') presentation?: string,
  ): Promise<PublicProjectResponseDto[]> {
    return this.publicProjectService.getProjects(locale, presentation);
  }

  @Get(':slug')
  getProject(
    @Param('slug') slug: string,
    @Query('locale') locale?: string,
    @Query('presentation') presentation?: string,
  ): Promise<PublicProjectResponseDto> {
    return this.publicProjectService.getProject(
      slug,
      locale,
      presentation,
    );
  }
}
