import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { AdminPublicDto } from '../admin-users/admin-user.dto.js';
import { AuthService } from './auth.service.js';
import { CurrentAdmin } from './current-admin.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { LoginDto } from './auth.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentAdmin(
    @CurrentAdmin() admin: AdminPublicDto,
  ): AdminPublicDto {
    return admin;
  }
}
