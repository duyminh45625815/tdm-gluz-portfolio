import type { AdminUserDocument } from './admin-user.schema.js';

export interface AdminPublicDto {
  id: string;
  email: string;
  role: 'admin';
  isActive: boolean;
  lastLoginAt: Date | null;
}

export function toAdminPublicDto(admin: AdminUserDocument): AdminPublicDto {
  return {
    id: admin._id.toString(),
    email: admin.email,
    role: admin.role,
    isActive: admin.isActive,
    lastLoginAt: admin.lastLoginAt ?? null,
  };
}
