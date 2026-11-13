import { Global, INestApplication, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { Types } from 'mongoose';
import { vi } from 'vitest';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppController } from './../src/app.controller.js';
import { AppService } from './../src/app.service.js';
import { ADMIN_USER_MODEL } from './../src/admin-users/admin-user.schema.js';
import { configureApplication } from './../src/app-setup.js';
import { AdminUsersModule } from './../src/admin-users/admin-users.module.js';
import { AuthModule } from './../src/auth/auth.module.js';
import { EducationModule } from './../src/education/education.module.js';
import { EDUCATION_MODEL } from './../src/education/education.schema.js';
import { HealthModule } from './../src/health/health.module.js';
import { PagesModule } from './../src/pages/pages.module.js';
import { PAGE_MODEL } from './../src/pages/page.schema.js';
import { ProjectsModule } from './../src/projects/projects.module.js';
import { PROJECT_MODEL } from './../src/projects/project.schema.js';
import { SiteSettingsModule } from './../src/site-settings/site-settings.module.js';
import { SITE_SETTINGS_MODEL } from './../src/site-settings/site-settings.schema.js';
import { SkillGroupsModule } from './../src/skill-groups/skill-groups.module.js';
import { SKILL_GROUP_MODEL } from './../src/skill-groups/skill-group.schema.js';

const TEST_JWT_SECRET = 'test-only-jwt-secret-with-sufficient-length-32-bytes';
const TEST_ADMIN_PASSWORD = 'local-test-password-2026';
const testConnection = {
  readyState: 1,
  models: {},
  model: vi.fn(() => ({})),
  close: vi.fn().mockResolvedValue(undefined),
};

@Global()
@Module({
  providers: [
    {
      provide: getConnectionToken(),
      useValue: testConnection,
    },
  ],
  exports: [getConnectionToken()],
})
class TestDatabaseModule {}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    TestDatabaseModule,
    HealthModule,
    SiteSettingsModule,
    PagesModule,
    ProjectsModule,
    SkillGroupsModule,
    EducationModule,
    AdminUsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
class TestAppModule {}

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
  let admin: TestAdmin;
  let lookupAdmin: TestAdmin | null;
  let updatedAdmin: TestAdmin | null;
  let adminModel: {
    findOne: ReturnType<typeof vi.fn>;
    findOneAndUpdate: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
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
      findOne: vi.fn((filter: Record<string, unknown>) =>
        createQuery(
          filter.isActive === true && lookupAdmin?.isActive === false
            ? null
            : lookupAdmin,
        ),
      ),
      findOneAndUpdate: vi.fn(() => createQuery(updatedAdmin)),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    })
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          NODE_ENV: 'test',
          JWT_SECRET: TEST_JWT_SECRET,
          CORS_ALLOWED_ORIGINS: ['http://localhost:3000'],
          LOGIN_RATE_LIMIT_MAX: 3,
          LOGIN_RATE_LIMIT_TTL_MS: 100,
        }),
      )
      .overrideProvider(getModelToken(ADMIN_USER_MODEL))
      .useValue(adminModel)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app, app.get(ConfigService));
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

    await request(app!.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@example.test',
        password: TEST_ADMIN_PASSWORD,
        role: 'admin',
      })
      .expect(400);
  });

  it('limits login attempts by client IP without throttling the health route', async () => {
    const submitInvalidLogin = () =>
      request(app!.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'bad', password: '' });

    await submitInvalidLogin().expect(400);
    await submitInvalidLogin().expect(400);
    await submitInvalidLogin().expect(400);

    const limited = await submitInvalidLogin().expect(429);

    expect(limited.body).toEqual({
      statusCode: 429,
      message: 'Too many login attempts. Please try again later.',
    });
    await request(app!.getHttpServer()).get('/api/health').expect(200);
  });

  it('counts successful login requests and resets the login limit after its window', async () => {
    await request(app!.getHttpServer())
      .post('/api/auth/login')
      .send({ email: admin.email, password: TEST_ADMIN_PASSWORD })
      .expect(200);
    await request(app!.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'bad', password: '' })
      .expect(400);
    await request(app!.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'bad', password: '' })
      .expect(400);
    await request(app!.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'bad', password: '' })
      .expect(429);

    await new Promise((resolve) => setTimeout(resolve, 1_100));

    await request(app!.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'bad', password: '' })
      .expect(400);
  });

  it('applies configured CORS and security headers', async () => {
    const allowedOrigin = await request(app!.getHttpServer())
      .get('/api/health')
      .set('Origin', 'http://localhost:3000')
      .expect(200);

    expect(allowedOrigin.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    );
    expect(allowedOrigin.headers['x-content-type-options']).toBe('nosniff');
    expect(allowedOrigin.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(allowedOrigin.headers['x-powered-by']).toBeUndefined();

    const unconfiguredOrigin = await request(app!.getHttpServer())
      .get('/api/health')
      .set('Origin', 'https://unconfigured.example')
      .expect(200);

    expect(
      unconfiguredOrigin.headers['access-control-allow-origin'],
    ).toBeUndefined();
  });

  it('rejects a token after its admin account is deactivated', async () => {
    const login = await request(app!.getHttpServer())
      .post('/api/auth/login')
      .send({ email: admin.email, password: TEST_ADMIN_PASSWORD })
      .expect(200);

    lookupAdmin = { ...admin, isActive: false };

    await request(app!.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(401);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });
});
