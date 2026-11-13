import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AdminPublicDto, toAdminPublicDto } from './admin-user.dto.js';
import {
  ADMIN_USER_MODEL,
  AdminUser,
} from './admin-user.schema.js';
import { normalizeAdminEmail } from './admin-user.utils.js';
import { PasswordHashService } from './password-hash.service.js';

@Injectable()
export class AdminProvisioningService {
  constructor(
    @InjectModel(ADMIN_USER_MODEL)
    private readonly adminUsers: Model<AdminUser>,
    private readonly passwordHashService: PasswordHashService,
  ) {}

  async createAdmin(email: string, password: string): Promise<AdminPublicDto> {
    const normalizedEmail = normalizeAdminEmail(email);

    if (Array.from(password).length < 12) {
      throw new BadRequestException(
        'The admin password must be at least 12 characters long.',
      );
    }

    await this.adminUsers.init();

    if (await this.adminUsers.exists({ email: normalizedEmail }).exec()) {
      throw new ConflictException(
        'An admin account with that email already exists.',
      );
    }

    const passwordHash = await this.passwordHashService.hash(password);

    try {
      const admin = await this.adminUsers.create({
        email: normalizedEmail,
        passwordHash,
        role: 'admin',
        isActive: true,
      });

      return toAdminPublicDto(admin);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(
          'An admin account with that email already exists.',
        );
      }

      throw error;
    }
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  );
}
