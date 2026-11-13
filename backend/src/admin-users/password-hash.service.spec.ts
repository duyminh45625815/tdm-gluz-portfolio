import { Mongoose } from 'mongoose';
import { AdminUserSchema } from './admin-user.schema.js';
import { PasswordHashService } from './password-hash.service.js';

describe('PasswordHashService', () => {
  it('hashes with Argon2id and verifies credentials without accepting missing hashes', async () => {
    const service = new PasswordHashService();
    await service.onModuleInit();

    const passwordHash = await service.hash('test-password-for-argon2');

    expect(passwordHash).toMatch(/^\$argon2id\$/);
    expect(passwordHash).not.toBe('test-password-for-argon2');

    const mongoose = new Mongoose();
    const AdminUserModel = mongoose.model('Argon2AdminSchemaTest', AdminUserSchema);
    const admin = new AdminUserModel({
      email: 'admin@example.test',
      passwordHash,
    });

    await expect(admin.validate()).resolves.toBeUndefined();
    await expect(
      service.verify(passwordHash, 'test-password-for-argon2'),
    ).resolves.toBe(true);
    await expect(
      service.verify(passwordHash, 'different-password'),
    ).resolves.toBe(false);
    await expect(
      service.verify('not-an-argon2-hash', 'test-password-for-argon2'),
    ).resolves.toBe(false);
    await expect(
      service.verify(undefined, 'test-password-for-argon2'),
    ).resolves.toBe(false);
  });
});
