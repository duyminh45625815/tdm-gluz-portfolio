import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  EDUCATION_COLLECTION,
  EDUCATION_MODEL,
  EducationSchema,
} from './education.schema.js';

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
  exports: [MongooseModule],
})
export class EducationModule {}
