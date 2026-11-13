import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import {
  CreateProjectDto,
  ProjectResponseDto,
  UpdateProjectDraftDto,
  UpdateProjectDto,
} from './project-admin.dto.js';
import { ProjectAdminService } from './project-admin.service.js';

@Controller('admin/projects')
@UseGuards(JwtAuthGuard)
export class ProjectAdminController {
  constructor(private readonly projectAdminService: ProjectAdminService) {}

  @Get()
  getProjects(): Promise<ProjectResponseDto[]> {
    return this.projectAdminService.getProjects();
  }

  @Get(':slug')
  getProject(@Param('slug') slug: string): Promise<ProjectResponseDto> {
    return this.projectAdminService.getProject(slug);
  }

  @Post()
  createProject(
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectAdminService.createProject(dto);
  }

  @Patch(':slug')
  updateProject(
    @Param('slug') slug: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectAdminService.updateProject(slug, dto);
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteProject(@Param('slug') slug: string): Promise<void> {
    return this.projectAdminService.deleteProject(slug);
  }

  @Patch(':slug/draft/:locale')
  updateDraft(
    @Param('slug') slug: string,
    @Param('locale') locale: string,
    @Body() dto: UpdateProjectDraftDto,
  ): Promise<ProjectResponseDto> {
    return this.projectAdminService.updateDraft(slug, locale, dto);
  }

  @Post(':slug/publish/:locale')
  @HttpCode(HttpStatus.OK)
  publishLocale(
    @Param('slug') slug: string,
    @Param('locale') locale: string,
  ): Promise<ProjectResponseDto> {
    return this.projectAdminService.publishLocale(slug, locale);
  }
}
