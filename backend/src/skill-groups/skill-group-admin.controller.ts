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
  CreateSkillGroupDto,
  SkillGroupResponseDto,
  UpdateSkillGroupDraftDto,
  UpdateSkillGroupDto,
} from './skill-group-admin.dto.js';
import { SkillGroupAdminService } from './skill-group-admin.service.js';

@Controller('admin/skill-groups')
@UseGuards(JwtAuthGuard)
export class SkillGroupAdminController {
  constructor(
    private readonly skillGroupAdminService: SkillGroupAdminService,
  ) {}

  @Get()
  getSkillGroups(): Promise<SkillGroupResponseDto[]> {
    return this.skillGroupAdminService.getSkillGroups();
  }

  @Get(':key')
  getSkillGroup(@Param('key') key: string): Promise<SkillGroupResponseDto> {
    return this.skillGroupAdminService.getSkillGroup(key);
  }

  @Post()
  createSkillGroup(
    @Body() dto: CreateSkillGroupDto,
  ): Promise<SkillGroupResponseDto> {
    return this.skillGroupAdminService.createSkillGroup(dto);
  }

  @Patch(':key')
  updateSkillGroup(
    @Param('key') key: string,
    @Body() dto: UpdateSkillGroupDto,
  ): Promise<SkillGroupResponseDto> {
    return this.skillGroupAdminService.updateSkillGroup(key, dto);
  }

  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSkillGroup(@Param('key') key: string): Promise<void> {
    return this.skillGroupAdminService.deleteSkillGroup(key);
  }

  @Patch(':key/draft/:locale')
  updateDraft(
    @Param('key') key: string,
    @Param('locale') locale: string,
    @Body() dto: UpdateSkillGroupDraftDto,
  ): Promise<SkillGroupResponseDto> {
    return this.skillGroupAdminService.updateDraft(key, locale, dto);
  }

  @Post(':key/publish/:locale')
  @HttpCode(HttpStatus.OK)
  publishLocale(
    @Param('key') key: string,
    @Param('locale') locale: string,
  ): Promise<SkillGroupResponseDto> {
    return this.skillGroupAdminService.publishLocale(key, locale);
  }
}
