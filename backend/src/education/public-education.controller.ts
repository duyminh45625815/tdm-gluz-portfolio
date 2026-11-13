import { Controller, Get, Query } from '@nestjs/common';
import type { PublicEducationResponseDto } from './public-education.dto.js';
import { PublicEducationService } from './public-education.service.js';

@Controller('public/education')
export class PublicEducationController {
  constructor(
    private readonly publicEducationService: PublicEducationService,
  ) {}

  @Get()
  getEducationRecords(
    @Query('locale') locale?: string,
    @Query('presentation') presentation?: string,
  ): Promise<PublicEducationResponseDto[]> {
    return this.publicEducationService.getEducationRecords(
      locale,
      presentation,
    );
  }
}
