import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SKILL_GROUP_COLLECTION,
  SKILL_GROUP_MODEL,
  SkillGroupSchema,
} from './skill-group.schema.js';

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
  exports: [MongooseModule],
})
export class SkillGroupsModule {}
