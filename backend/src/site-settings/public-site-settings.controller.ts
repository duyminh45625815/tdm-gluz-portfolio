import { Controller, Get } from '@nestjs/common';
import type { PublicSiteSettingsResponseDto } from './public-site-settings.dto.js';
import { PublicSiteSettingsService } from './public-site-settings.service.js';

@Controller('public/site-settings')
export class PublicSiteSettingsController {
  constructor(
    private readonly publicSiteSettingsService: PublicSiteSettingsService,
  ) {}

  @Get()
  getPublicSettings(): Promise<PublicSiteSettingsResponseDto> {
    return this.publicSiteSettingsService.getPublicSettings();
  }
}
