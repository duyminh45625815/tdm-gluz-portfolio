import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Model } from 'mongoose';
import { ADMIN_USER_MODEL, type AdminUser } from '../admin-users/admin-user.schema.js';
import {
  AdminPublicDto,
  toAdminPublicDto,
} from '../admin-users/admin-user.dto.js';
import { getJwtSecret } from './jwt.config.js';

interface AdminTokenPayload {
  sub: string;
  role: 'admin';
}

function isAdminTokenPayload(payload: unknown): payload is AdminTokenPayload {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const candidate = payload as Record<string, unknown>;

  return (
    typeof candidate.sub === 'string' &&
    /^[\da-f]{24}$/i.test(candidate.sub) &&
    candidate.role === 'admin'
  );
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectModel(ADMIN_USER_MODEL)
    private readonly adminUsers: Model<AdminUser>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(configService),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: unknown): Promise<AdminPublicDto> {
    if (!isAdminTokenPayload(payload)) {
      throw new UnauthorizedException();
    }

    const admin = await this.adminUsers
      .findOne({
        _id: payload.sub,
        role: 'admin',
        isActive: true,
      })
      .exec();

    if (!admin) {
      throw new UnauthorizedException();
    }

    return toAdminPublicDto(admin);
  }
}
