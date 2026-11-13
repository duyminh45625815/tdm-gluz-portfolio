import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  EDUCATION_COLLECTION,
  EDUCATION_MODEL,
  EducationSchema,
} from './education.schema.js';
import { EducationAdminController } from './education-admin.controller.js';
import { EducationAdminService } from './education-admin.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: EDUCATION_MODEL,
        schema: EducationSchema,
        collection: EDUCATION_COLLECTION,
      },
    ]),
  ],
  controllers: [EducationAdminController],
  providers: [EducationAdminService],
  exports: [MongooseModule],
})
export class EducationModule {}
