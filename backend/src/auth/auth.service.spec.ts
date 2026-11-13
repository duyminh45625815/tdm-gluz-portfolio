import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { PasswordHashService } from '../admin-users/password-hash.service.js';
import { ADMIN_USER_MODEL } from '../admin-users/admin-user.schema.js';
import { AuthService } from './auth.service.js';
import {
  createJwtModuleOptions,
  getJwtSecret,
} from './jwt.config.js';

function createQuery<T>(value: T) {
  const query = {
    select: vi.fn(),
    exec: vi.fn().mockResolvedValue(value),
  };
  query.select.mockReturnValue(query);
  return query;
}

describe('AuthService', () => {
  const adminId = '0123456789abcdef01234567';
  const admin = {
    _id: { toString: () => adminId },
    email: 'admin@example.test',
    role: 'admin' as const,
    isActive: true,
    passwordHash: 'stored-argon2-hash',
    lastLoginAt: null,
  };

  async function createService(options?: {
    lookupResult?: typeof admin | null;
    updatedAdmin?: typeof admin | null;
    passwordMatches?: boolean;
  }) {
    const lookupResult = options?.lookupResult === undefined
      ? admin
      : options.lookupResult;
    const updatedAdmin = options?.updatedAdmin === undefined
      ? admin
      : options.updatedAdmin;
    const model = {
      findOne: vi.fn(() => createQuery(lookupResult)),
      findOneAndUpdate: vi.fn(() => createQuery(updatedAdmin)),
    };
    const passwordHashService = {
      verify: vi.fn().mockResolvedValue(options?.passwordMatches ?? true),
    };
    const jwtService = {
      signAsync: vi.fn().mockResolvedValue('signed-access-token'),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(ADMIN_USER_MODEL), useValue: model },
        { provide: PasswordHashService, useValue: passwordHashService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    return {
      authService: moduleRef.get(AuthService),
      model,
      passwordHashService,
      jwtService,
      moduleRef,
    };
  }

  it('normalizes email, verifies the explicitly selected hash and returns a safe DTO', async () => {
    const { authService, model, passwordHashService, jwtService, moduleRef } =
      await createService();

    try {
      const response = await authService.login(
        ' ADMIN@EXAMPLE.TEST ',
        'correct-password',
      );

      expect(model.findOne).toHaveBeenCalledWith({
        email: 'admin@example.test',
      });
      expect(model.findOne.mock.results[0].value.select).toHaveBeenCalledWith(
        '+passwordHash',
      );
      expect(passwordHashService.verify).toHaveBeenCalledWith(
        'stored-argon2-hash',
        'correct-password',
      );
      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: admin._id, isActive: true, role: 'admin' },
        { $set: { lastLoginAt: expect.any(Date) } },
        { new: true },
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: adminId,
        role: 'admin',
      });
      expect(response.admin).toEqual({
        id: adminId,
        email: 'admin@example.test',
        role: 'admin',
        isActive: true,
        lastLoginAt: null,
      });
      expect(response.admin).not.toHaveProperty('passwordHash');
    } finally {
      await moduleRef.close();
    }
  });

  it.each([
    ['incorrect password', { passwordMatches: false }],
    ['unknown email', { lookupResult: null }],
    ['inactive admin', { lookupResult: { ...admin, isActive: false } }],
  ])('rejects %s with the same generic response', async (_case, options) => {
    const { authService, model, passwordHashService, moduleRef } =
      await createService(options);

    try {
      await expect(
        authService.login('admin@example.test', 'incorrect-password'),
      ).rejects.toMatchObject({
        message: 'Invalid credentials.',
      });
      expect(passwordHashService.verify).toHaveBeenCalled();
      expect(model.findOneAndUpdate).not.toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });
});

describe('JWT configuration', () => {
  it('requires a strong configured secret and sets a finite HS256 lifetime', () => {
    const missingSecret = new ConfigService({});
    expect(() => getJwtSecret(missingSecret)).toThrow(
      'JWT_SECRET must be configured',
    );

    const configService = new ConfigService({
      JWT_SECRET: 'test-secret-with-more-than-thirty-two-characters',
    });
    expect(getJwtSecret(configService)).toBe(
      'test-secret-with-more-than-thirty-two-characters',
    );
    expect(createJwtModuleOptions(configService)).toMatchObject({
      signOptions: { algorithm: 'HS256', expiresIn: '15m' },
      verifyOptions: { algorithms: ['HS256'] },
    });
  });
});
