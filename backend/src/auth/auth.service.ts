import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import type { Model } from 'mongoose';
import {
  ADMIN_USER_MODEL,
  type AdminUser,
} from '../admin-users/admin-user.schema.js';
import { toAdminPublicDto } from '../admin-users/admin-user.dto.js';
import { normalizeAdminEmail } from '../admin-users/admin-user.utils.js';
import { PasswordHashService } from '../admin-users/password-hash.service.js';
import type { LoginResponseDto } from './auth.dto.js';
import { JWT_ACCESS_TOKEN_TTL_SECONDS } from './jwt.config.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(ADMIN_USER_MODEL)
    private readonly adminUsers: Model<AdminUser>,
    private readonly passwordHashService: PasswordHashService,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    email: string,
    password: string,
  ): Promise<LoginResponseDto> {
    const normalizedEmail = normalizeAdminEmail(email);
    const admin = await this.adminUsers
      .findOne({ email: normalizedEmail })
      .select('+passwordHash')
      .exec();

    const passwordMatches = await this.passwordHashService.verify(
      admin?.passwordHash,
      password,
    );

    if (!admin || !passwordMatches || !admin.isActive || admin.role !== 'admin') {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const updatedAdmin = await this.adminUsers
      .findOneAndUpdate(
        { _id: admin._id, isActive: true, role: 'admin' },
        { $set: { lastLoginAt: new Date() } },
        { new: true },
      )
      .exec();

    if (!updatedAdmin) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const safeAdmin = toAdminPublicDto(updatedAdmin);
    const accessToken = await this.jwtService.signAsync({
      sub: safeAdmin.id,
      role: safeAdmin.role,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: JWT_ACCESS_TOKEN_TTL_SECONDS,
      admin: safeAdmin,
    };
  }
}
