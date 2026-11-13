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
  CreateEducationDto,
  EducationResponseDto,
  UpdateEducationDraftDto,
  UpdateEducationDto,
} from './education-admin.dto.js';
import { EducationAdminService } from './education-admin.service.js';

@Controller('admin/education')
@UseGuards(JwtAuthGuard)
export class EducationAdminController {
  constructor(
    private readonly educationAdminService: EducationAdminService,
  ) {}

  @Get()
  getEducationRecords(): Promise<EducationResponseDto[]> {
    return this.educationAdminService.getEducationRecords();
  }

  @Get(':id')
  getEducationRecord(
    @Param('id') id: string,
  ): Promise<EducationResponseDto> {
    return this.educationAdminService.getEducationRecord(id);
  }

  @Post()
  createEducationRecord(
    @Body() dto: CreateEducationDto,
  ): Promise<EducationResponseDto> {
    return this.educationAdminService.createEducationRecord(dto);
  }

  @Patch(':id')
  updateEducationRecord(
    @Param('id') id: string,
    @Body() dto: UpdateEducationDto,
  ): Promise<EducationResponseDto> {
    return this.educationAdminService.updateEducationRecord(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteEducationRecord(@Param('id') id: string): Promise<void> {
    return this.educationAdminService.deleteEducationRecord(id);
  }

  @Patch(':id/draft/:locale')
  updateDraft(
    @Param('id') id: string,
    @Param('locale') locale: string,
    @Body() dto: UpdateEducationDraftDto,
  ): Promise<EducationResponseDto> {
    return this.educationAdminService.updateDraft(id, locale, dto);
  }

  @Post(':id/publish/:locale')
  @HttpCode(HttpStatus.OK)
  publishLocale(
    @Param('id') id: string,
    @Param('locale') locale: string,
  ): Promise<EducationResponseDto> {
    return this.educationAdminService.publishLocale(id, locale);
  }
}
