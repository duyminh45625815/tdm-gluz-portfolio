import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ADMIN_USER_COLLECTION,
  ADMIN_USER_MODEL,
  AdminUserSchema,
} from './admin-user.schema.js';
import { AdminProvisioningService } from './admin-provisioning.service.js';
import { PasswordHashService } from './password-hash.service.js';

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
  providers: [AdminProvisioningService, PasswordHashService],
  exports: [MongooseModule, AdminProvisioningService, PasswordHashService],
})
export class AdminUsersModule {}
