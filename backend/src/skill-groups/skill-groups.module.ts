import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SiteSettingsModule } from '../site-settings/site-settings.module.js';
import {
  SKILL_GROUP_COLLECTION,
  SKILL_GROUP_MODEL,
  SkillGroupSchema,
} from './skill-group.schema.js';
import { SkillGroupAdminController } from './skill-group-admin.controller.js';
import { SkillGroupAdminService } from './skill-group-admin.service.js';
import { PublicSkillGroupController } from './public-skill-group.controller.js';
import { PublicSkillGroupService } from './public-skill-group.service.js';

@Module({
  imports: [
    SiteSettingsModule,
    MongooseModule.forFeature([
      {
        name: SKILL_GROUP_MODEL,
        schema: SkillGroupSchema,
        collection: SKILL_GROUP_COLLECTION,
      },
    ]),
  ],
  controllers: [SkillGroupAdminController, PublicSkillGroupController],
  providers: [SkillGroupAdminService, PublicSkillGroupService],
  exports: [MongooseModule],
})
export class SkillGroupsModule {}
