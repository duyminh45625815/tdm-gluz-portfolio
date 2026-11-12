import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ADMIN_USER_COLLECTION,
  ADMIN_USER_MODEL,
  AdminUserSchema,
} from './admin-user.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ADMIN_USER_MODEL,
        schema: AdminUserSchema,
        collection: ADMIN_USER_COLLECTION,
      },
    ]),
  ],
  exports: [MongooseModule],
})
export class AdminUsersModule {}
