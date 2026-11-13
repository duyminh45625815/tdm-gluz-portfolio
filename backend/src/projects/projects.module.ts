import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PROJECT_COLLECTION,
  PROJECT_MODEL,
  ProjectSchema,
} from './project.schema.js';
import { ProjectAdminController } from './project-admin.controller.js';
import { ProjectAdminService } from './project-admin.service.js';

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
  controllers: [ProjectAdminController],
  providers: [ProjectAdminService],
  exports: [MongooseModule],
})
export class ProjectsModule {}
