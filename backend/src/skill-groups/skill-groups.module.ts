import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SKILL_GROUP_COLLECTION,
  SKILL_GROUP_MODEL,
  SkillGroupSchema,
} from './skill-group.schema.js';
import { SkillGroupAdminController } from './skill-group-admin.controller.js';
import { SkillGroupAdminService } from './skill-group-admin.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: SKILL_GROUP_MODEL,
        schema: SkillGroupSchema,
        collection: SKILL_GROUP_COLLECTION,
      },
    ]),
  ],
  controllers: [SkillGroupAdminController],
  providers: [SkillGroupAdminService],
  exports: [MongooseModule],
})
export class SkillGroupsModule {}
