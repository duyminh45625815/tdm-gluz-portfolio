import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SiteSettingsModule } from '../site-settings/site-settings.module.js';
import {
  PROJECT_COLLECTION,
  PROJECT_MODEL,
  ProjectSchema,
} from './project.schema.js';
import { ProjectAdminController } from './project-admin.controller.js';
import { ProjectAdminService } from './project-admin.service.js';
import { PublicProjectController } from './public-project.controller.js';
import { PublicProjectService } from './public-project.service.js';

@Module({
  imports: [
    SiteSettingsModule,
    MongooseModule.forFeature([
      {
        name: PROJECT_MODEL,
        schema: ProjectSchema,
        collection: PROJECT_COLLECTION,
      },
    ]),
  ],
  controllers: [ProjectAdminController, PublicProjectController],
  providers: [ProjectAdminService, PublicProjectService],
  exports: [MongooseModule],
})
export class ProjectsModule {}
