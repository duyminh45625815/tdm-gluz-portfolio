import {
  createParamDecorator,
  type ExecutionContext,
} from '@nestjs/common';
import type { AdminPublicDto } from '../admin-users/admin-user.dto.js';

interface AuthenticatedRequest {
  user: AdminPublicDto;
}

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AdminPublicDto =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
