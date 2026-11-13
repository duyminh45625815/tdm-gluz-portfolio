import type { ConfigService } from '@nestjs/config';
import type { JwtModuleOptions } from '@nestjs/jwt';

export const JWT_ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export function getJwtSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_SECRET');

  if (!secret || secret.trim().length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  }

  return secret;
}

export function createJwtModuleOptions(
  configService: ConfigService,
): JwtModuleOptions {
  return {
    secret: getJwtSecret(configService),
    signOptions: {
      algorithm: 'HS256',
      expiresIn: '15m',
    },
    verifyOptions: {
      algorithms: ['HS256'],
    },
  };
}
