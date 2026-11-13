import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminUsersModule } from '../admin-users/admin-users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { createJwtModuleOptions } from './jwt.config.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { JwtStrategy } from './jwt.strategy.js';

@Module({
  imports: [
    ConfigModule,
    AdminUsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            limit: configService.getOrThrow<number>('LOGIN_RATE_LIMIT_MAX'),
            ttl: configService.getOrThrow<number>('LOGIN_RATE_LIMIT_TTL_MS'),
          },
        ],
        errorMessage: 'Too many login attempts. Please try again later.',
      }),
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: createJwtModuleOptions,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, JwtStrategy],
})
export class AuthModule {}
