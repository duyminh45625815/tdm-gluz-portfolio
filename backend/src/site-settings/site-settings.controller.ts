import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import {
  CreateSiteSettingsDto,
  UpdateSiteSettingsDto,
  type SiteSettingsResponseDto,
} from './site-settings.dto.js';
import { SiteSettingsService } from './site-settings.service.js';

@Controller('admin/site-settings')
@UseGuards(JwtAuthGuard)
export class SiteSettingsController {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

  @Get()
  getCurrent(): Promise<SiteSettingsResponseDto> {
    return this.siteSettingsService.getCurrent();
  }

  @Post()
  create(
    @Body() dto: CreateSiteSettingsDto,
  ): Promise<SiteSettingsResponseDto> {
    return this.siteSettingsService.create(dto);
  }

  @Patch()
  update(
    @Body() dto: UpdateSiteSettingsDto,
  ): Promise<SiteSettingsResponseDto> {
    return this.siteSettingsService.update(dto);
  }
}
