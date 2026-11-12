import { Schema, type HydratedDocument } from 'mongoose';

export const ADMIN_USER_MODEL = 'AdminUser';
export const ADMIN_USER_COLLECTION = 'adminUsers';

export interface AdminUser {
  email: string;
  passwordHash: string;
  role: 'admin';
  isActive: boolean;
  lastLoginAt?: Date;
}

function removePasswordHash(
  _document: unknown,
  value: Record<string, unknown>,
): Record<string, unknown> {
  delete value.passwordHash;
  return value;
}

export const AdminUserSchema = new Schema<AdminUser>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    passwordHash: { type: String, required: true, select: false, trim: true },
    role: { type: String, enum: ['admin'], required: true, default: 'admin' },
    isActive: { type: Boolean, required: true, default: true },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    strict: true,
    collection: ADMIN_USER_COLLECTION,
    toJSON: { transform: removePasswordHash },
    toObject: { transform: removePasswordHash },
  },
);

AdminUserSchema.index({ email: 1 }, { unique: true });

export type AdminUserDocument = HydratedDocument<AdminUser>;
