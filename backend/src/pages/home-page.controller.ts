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
  HomePageContentDto,
  type HomePageResponseDto,
} from './home-page.dto.js';
import { HomePageService } from './home-page.service.js';

@Controller('admin/pages/home')
@UseGuards(JwtAuthGuard)
export class HomePageController {
  constructor(private readonly homePageService: HomePageService) {}

  @Get()
  getHomePage(): Promise<HomePageResponseDto> {
    return this.homePageService.getHomePage();
  }

  @Post()
  initializeHomePage(): Promise<HomePageResponseDto> {
    return this.homePageService.initializeHomePage();
  }

  @Patch('draft/:locale')
  updateDraft(
    @Param('locale') locale: string,
    @Body() dto: HomePageContentDto,
  ): Promise<HomePageResponseDto> {
    return this.homePageService.updateDraft(locale, dto);
  }

  @Post('publish/:locale')
  @HttpCode(HttpStatus.OK)
  publishLocale(
    @Param('locale') locale: string,
  ): Promise<HomePageResponseDto> {
    return this.homePageService.publishLocale(locale);
  }
}
