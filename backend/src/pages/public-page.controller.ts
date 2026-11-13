import { Controller, Get, Query } from '@nestjs/common';
import type {
  PublicAboutPageResponseDto,
  PublicHomePageResponseDto,
} from './public-page.dto.js';
import { PublicPageService } from './public-page.service.js';

@Controller('public/pages')
export class PublicPageController {
  constructor(private readonly publicPageService: PublicPageService) {}

  @Get('home')
  getHomePage(
    @Query('locale') locale?: string,
  ): Promise<PublicHomePageResponseDto> {
    return this.publicPageService.getHomePage(locale);
  }

  @Get('about')
  getAboutPage(
    @Query('locale') locale?: string,
  ): Promise<PublicAboutPageResponseDto> {
    return this.publicPageService.getAboutPage(locale);
  }
}
