import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ADMIN_USER_MODEL } from './admin-user.schema.js';
import { AdminProvisioningService } from './admin-provisioning.service.js';
import { PasswordHashService } from './password-hash.service.js';

function createQuery<T>(value: T) {
  return {
    exec: vi.fn().mockResolvedValue(value),
  };
}

describe('AdminProvisioningService', () => {
  it('hashes the password and creates a fixed-role active admin', async () => {
    const account = {
      _id: { toString: () => '0123456789abcdef01234567' },
      email: 'admin@example.test',
      role: 'admin' as const,
      isActive: true,
      lastLoginAt: null,
    };
    const model = {
      init: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn(() => createQuery(null)),
      create: vi.fn().mockResolvedValue(account),
    };
    const passwordHashService = {
      hash: vi.fn().mockResolvedValue('encoded-argon2-hash'),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminProvisioningService,
        { provide: getModelToken(ADMIN_USER_MODEL), useValue: model },
        { provide: PasswordHashService, useValue: passwordHashService },
      ],
    }).compile();

    try {
      const result = await moduleRef
        .get(AdminProvisioningService)
        .createAdmin(' ADMIN@EXAMPLE.TEST ', 'long-enough-password');

      expect(model.exists).toHaveBeenCalledWith({
        email: 'admin@example.test',
      });
      expect(model.init).toHaveBeenCalledOnce();
      expect(passwordHashService.hash).toHaveBeenCalledWith(
        'long-enough-password',
      );
      expect(model.create).toHaveBeenCalledWith({
        email: 'admin@example.test',
        passwordHash: 'encoded-argon2-hash',
        role: 'admin',
        isActive: true,
      });
      expect(model.create.mock.calls[0][0]).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('passwordHash');
    } finally {
      await moduleRef.close();
    }
  });

  it('rejects an existing email without hashing or creating another account', async () => {
    const model = {
      init: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn(() => createQuery({ _id: 'existing-id' })),
      create: vi.fn(),
    };
    const passwordHashService = {
      hash: vi.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminProvisioningService,
        { provide: getModelToken(ADMIN_USER_MODEL), useValue: model },
        { provide: PasswordHashService, useValue: passwordHashService },
      ],
    }).compile();

    try {
      await expect(
        moduleRef
          .get(AdminProvisioningService)
          .createAdmin('admin@example.test', 'long-enough-password'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(passwordHashService.hash).not.toHaveBeenCalled();
      expect(model.create).not.toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });
});
