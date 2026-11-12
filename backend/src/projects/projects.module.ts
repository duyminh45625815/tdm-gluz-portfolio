import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PROJECT_COLLECTION,
  PROJECT_MODEL,
  ProjectSchema,
} from './project.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: PROJECT_MODEL,
        schema: ProjectSchema,
        collection: PROJECT_COLLECTION,
      },
    ]),
  ],
  exports: [MongooseModule],
})
export class ProjectsModule {}
