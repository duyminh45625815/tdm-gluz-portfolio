import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { Types } from 'mongoose';
import { vi } from 'vitest';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { ADMIN_USER_MODEL } from './../src/admin-users/admin-user.schema.js';
import { EDUCATION_MODEL } from './../src/education/education.schema.js';
import { AppModule } from './../src/app.module.js';
import { PAGE_MODEL } from './../src/pages/page.schema.js';
import { PROJECT_MODEL } from './../src/projects/project.schema.js';
import { SITE_SETTINGS_MODEL } from './../src/site-settings/site-settings.schema.js';
import { SKILL_GROUP_MODEL } from './../src/skill-groups/skill-group.schema.js';

const TEST_JWT_SECRET = 'test-only-jwt-secret-with-sufficient-length-32-bytes';
const TEST_ADMIN_PASSWORD = 'local-test-password-2026';

interface TestAdmin {
  _id: Types.ObjectId;
  email: string;
  role: 'admin';
  isActive: boolean;
  passwordHash: string;
  lastLoginAt: Date | null;
}

function createQuery<T>(value: T) {
  const query = {
    select: vi.fn(),
    exec: vi.fn().mockResolvedValue(value),
  };
  query.select.mockReturnValue(query);
  return query;
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App> | undefined;
  let previousJwtSecret: string | undefined;
  let admin: TestAdmin;
  let lookupAdmin: TestAdmin | null;
  let updatedAdmin: TestAdmin | null;
  let adminModel: {
    findOne: ReturnType<typeof vi.fn>;
    findOneAndUpdate: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    previousJwtSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = TEST_JWT_SECRET;

    const passwordHash = await argon2.hash(TEST_ADMIN_PASSWORD, {
      type: argon2.argon2id,
    });
    admin = {
      _id: new Types.ObjectId(),
      email: 'admin@example.test',
      role: 'admin',
      isActive: true,
      passwordHash,
      lastLoginAt: null,
    };
    lookupAdmin = admin;
    updatedAdmin = { ...admin, lastLoginAt: new Date() };
    adminModel = {
      findOne: vi.fn(() => createQuery(lookupAdmin)),
      findOneAndUpdate: vi.fn(() => createQuery(updatedAdmin)),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getModelToken(ADMIN_USER_MODEL))
      .useValue(adminModel)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app!.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health (GET)', () => {
    return request(app!.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          status: 'ok',
          database: 'connected',
          timestamp: expect.any(String),
        });
      });
  });

  it('registers all six collection models', () => {
    for (const modelName of [
      SITE_SETTINGS_MODEL,
      PAGE_MODEL,
      PROJECT_MODEL,
      SKILL_GROUP_MODEL,
      EDUCATION_MODEL,
      ADMIN_USER_MODEL,
    ]) {
      expect(
        app!.get(getModelToken(modelName), { strict: false }),
      ).toBeDefined();
    }
  });

  it('logs in, updates lastLoginAt, and returns a safe admin from login and /me', async () => {
    const login = await request(app!.getHttpServer())
      .post('/api/auth/login')
      .send({ email: ' ADMIN@EXAMPLE.TEST ', password: TEST_ADMIN_PASSWORD })
      .expect(200);

    expect(adminModel.findOne).toHaveBeenCalledWith({
      email: 'admin@example.test',
    });
    expect(adminModel.findOne.mock.results[0].value.select).toHaveBeenCalledWith(
      '+passwordHash',
    );
    expect(adminModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: admin._id, isActive: true, role: 'admin' },
      { $set: { lastLoginAt: expect.any(Date) } },
      { new: true },
    );
    expect(login.body).toMatchObject({
      tokenType: 'Bearer',
      expiresIn: 900,
      admin: {
        id: admin._id.toString(),
        email: admin.email,
        role: 'admin',
        isActive: true,
        lastLoginAt: expect.any(String),
      },
    });
    expect(JSON.stringify(login.body)).not.toContain('passwordHash');
    expect(JSON.stringify(login.body)).not.toContain(admin.passwordHash);

    const me = await request(app!.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(me.body).toMatchObject({
      id: admin._id.toString(),
      email: admin.email,
      role: 'admin',
      isActive: true,
    });
    expect(JSON.stringify(me.body)).not.toContain('passwordHash');
    expect(JSON.stringify(me.body)).not.toContain(admin.passwordHash);
  });

  it('returns the same generic unauthorized response for wrong passwords and unknown emails', async () => {
    const incorrectPassword = await request(app!.getHttpServer())
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'wrong-password' })
      .expect(401);

    lookupAdmin = null;
    const unknownEmail = await request(app!.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'unknown@example.test', password: 'wrong-password' })
      .expect(401);

    expect(unknownEmail.body).toEqual(incorrectPassword.body);
    expect(incorrectPassword.body.message).toBe('Invalid credentials.');
    expect(adminModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects inactive admins with the generic unauthorized response', async () => {
    lookupAdmin = { ...admin, isActive: false };

    const response = await request(app!.getHttpServer())
      .post('/api/auth/login')
      .send({ email: admin.email, password: TEST_ADMIN_PASSWORD })
      .expect(401);

    expect(response.body.message).toBe('Invalid credentials.');
    expect(adminModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects missing, invalid, and expired JWTs on /auth/me', async () => {
    await request(app!.getHttpServer()).get('/api/auth/me').expect(401);
    await request(app!.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    const jwtService = app!.get(JwtService, { strict: false });
    const expiredToken = await jwtService.signAsync(
      { sub: admin._id.toString(), role: 'admin' },
      { expiresIn: -1 },
    );

    await request(app!.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('validates login request DTOs', async () => {
    await request(app!.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: '' })
      .expect(400);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }

    if (previousJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousJwtSecret;
    }
  });
});
