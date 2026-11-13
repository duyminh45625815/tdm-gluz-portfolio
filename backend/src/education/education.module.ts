import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SiteSettingsModule } from '../site-settings/site-settings.module.js';
import {
  EDUCATION_COLLECTION,
  EDUCATION_MODEL,
  EducationSchema,
} from './education.schema.js';
import { EducationAdminController } from './education-admin.controller.js';
import { EducationAdminService } from './education-admin.service.js';
import { PublicEducationController } from './public-education.controller.js';
import { PublicEducationService } from './public-education.service.js';

@Module({
  imports: [
    SiteSettingsModule,
    MongooseModule.forFeature([
      {
        name: EDUCATION_MODEL,
        schema: EducationSchema,
        collection: EDUCATION_COLLECTION,
      },
    ]),
  ],
  controllers: [EducationAdminController, PublicEducationController],
  providers: [EducationAdminService, PublicEducationService],
  exports: [MongooseModule],
})
export class EducationModule {}
