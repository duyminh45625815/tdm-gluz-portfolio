import {
  Body,
  Controller,
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
  AboutPageContentDto,
  type AboutPageResponseDto,
} from './about-page.dto.js';
import { AboutPageService } from './about-page.service.js';

@Controller('admin/pages/about')
@UseGuards(JwtAuthGuard)
export class AboutPageController {
  constructor(private readonly aboutPageService: AboutPageService) {}

  @Get()
  getAboutPage(): Promise<AboutPageResponseDto> {
    return this.aboutPageService.getAboutPage();
  }

  @Post()
  initializeAboutPage(): Promise<AboutPageResponseDto> {
    return this.aboutPageService.initializeAboutPage();
  }

  @Patch('draft/:locale')
  updateDraft(
    @Param('locale') locale: string,
    @Body() dto: AboutPageContentDto,
  ): Promise<AboutPageResponseDto> {
    return this.aboutPageService.updateDraft(locale, dto);
  }

  @Post('publish/:locale')
  @HttpCode(HttpStatus.OK)
  publishLocale(
    @Param('locale') locale: string,
  ): Promise<AboutPageResponseDto> {
    return this.aboutPageService.publishLocale(locale);
  }
}
