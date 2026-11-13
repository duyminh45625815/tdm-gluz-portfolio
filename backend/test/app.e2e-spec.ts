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
import {
  SITE_SETTINGS_MODEL,
  type SiteSettings as SiteSettingsModel,
} from './../src/site-settings/site-settings.schema.js';
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

function createSiteSettingsDocument(settings: Record<string, unknown>) {
  return {
    toObject: vi.fn(() => flattenTestValue(settings)),
  };
}

function flattenTestValue(value: unknown): unknown {
  if (value instanceof Map) {
    return Object.fromEntries(
      Array.from(value.entries(), ([key, item]) => [
        key,
        flattenTestValue(item),
      ]),
    );
  }
  if (Array.isArray(value)) {
    return value.map(flattenTestValue);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        flattenTestValue(item),
      ]),
    );
  }

  return value;
}

function applyDottedSet(
  source: Record<string, unknown>,
  updates: Record<string, unknown>,
): Record<string, unknown> {
  const updated = structuredClone(source);

  for (const [path, value] of Object.entries(updates)) {
    const segments = path.split('.');
    let current = updated;

    for (const segment of segments.slice(0, -1)) {
      const nested = current[segment];
      if (
        typeof nested !== 'object' ||
        nested === null ||
        Array.isArray(nested)
      ) {
        current[segment] = {};
      }
      current = current[segment] as Record<string, unknown>;
    }

    current[segments[segments.length - 1]] = value;
  }

  return updated;
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App> | undefined;
  let admin: TestAdmin;
  let lookupAdmin: TestAdmin | null;
  let updatedAdmin: TestAdmin | null;
  let siteSettingsState: Record<string, unknown> | null;
  let adminModel: {
    findOne: ReturnType<typeof vi.fn>;
    findOneAndUpdate: ReturnType<typeof vi.fn>;
  };
  let siteSettingsModel: {
    init: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findOneAndUpdate: ReturnType<typeof vi.fn>;
  };

  async function createNonAdminToken(): Promise<string> {
    const jwtService = app!.get(JwtService, { strict: false });
    return jwtService.signAsync({
      sub: admin._id.toString(),
      role: 'editor',
    });
  }

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
    siteSettingsState = null;
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
    siteSettingsModel = {
      init: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn(() =>
        createQuery(siteSettingsState ? { _id: 'singleton-id' } : null),
      ),
      findOne: vi.fn(() =>
        createQuery(
          siteSettingsState
            ? createSiteSettingsDocument(siteSettingsState)
            : null,
        ),
      ),
      create: vi.fn(async (settings: SiteSettingsModel) => {
        siteSettingsState = {
          ...settings,
          _id: 'internal-id',
          __v: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return createSiteSettingsDocument(siteSettingsState);
      }),
      findOneAndUpdate: vi.fn(
        (
          _filter: unknown,
          update: { $set: Record<string, unknown> },
        ) => {
          if (!siteSettingsState) {
            return createQuery(null);
          }
          siteSettingsState = applyDottedSet(
            siteSettingsState,
            update.$set,
          );
          return createQuery(
            createSiteSettingsDocument(siteSettingsState),
          );
        },
      ),
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
          LOGIN_RATE_LIMIT_TTL_MS: 5_000,
        }),
      )
      .overrideProvider(getModelToken(ADMIN_USER_MODEL))
      .useValue(adminModel)
      .overrideProvider(getModelToken(SITE_SETTINGS_MODEL))
      .useValue(siteSettingsModel)
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

    await new Promise((resolve) => setTimeout(resolve, 5_100));

    await request(app!.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'bad', password: '' })
      .expect(400);
  }, 10_000);

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

  it('requires an authenticated admin for every settings management endpoint', async () => {
    await request(app!.getHttpServer())
      .get('/api/admin/site-settings')
      .expect(401);
    await request(app!.getHttpServer())
      .post('/api/admin/site-settings')
      .send({ localization: { defaultLocale: 'en' } })
      .expect(401);
    await request(app!.getHttpServer())
      .patch('/api/admin/site-settings')
      .send({ identity: { name: { en: 'Updated' } } })
      .expect(401);

    const nonAdminToken = await createNonAdminToken();

    await request(app!.getHttpServer())
      .get('/api/admin/site-settings')
      .set('Authorization', `Bearer ${nonAdminToken}`)
      .expect(401);
  });

  it('rejects an editor-role JWT from creating site settings', async () => {
    const nonAdminToken = await createNonAdminToken();

    await request(app!.getHttpServer())
      .post('/api/admin/site-settings')
      .set('Authorization', `Bearer ${nonAdminToken}`)
      .send({ localization: { defaultLocale: 'en' } })
      .expect(401);
  });

  it('rejects an editor-role JWT from updating site settings', async () => {
    const nonAdminToken = await createNonAdminToken();

    await request(app!.getHttpServer())
      .patch('/api/admin/site-settings')
      .set('Authorization', `Bearer ${nonAdminToken}`)
      .send({ identity: { name: { en: 'Updated' } } })
      .expect(401);
  });

  it('creates and retrieves the singleton settings without internal fields', async () => {
    const jwtService = app!.get(JwtService, { strict: false });
    const token = await jwtService.signAsync({
      sub: admin._id.toString(),
      role: 'admin',
    });
    const payload = {
      identity: { name: { vi: 'Tên', en: 'Name' } },
      contact: { socialLinks: { github: 'https://github.com/example' } },
      localization: { defaultLocale: 'en' },
      translations: { navigation: { home: { en: 'Home' } } },
    };

    const created = await request(app!.getHttpServer())
      .post('/api/admin/site-settings')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    expect(siteSettingsModel.init).toHaveBeenCalledOnce();
    expect(siteSettingsModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'main',
        localization: {
          defaultLocale: 'en',
          supportedLocales: ['vi', 'en', 'ja', 'ko'],
        },
      }),
    );
    expect(created.body).toMatchObject({
      identity: { name: { vi: 'Tên', en: 'Name' } },
      contact: { socialLinks: { github: 'https://github.com/example' } },
      localization: {
        defaultLocale: 'en',
        supportedLocales: ['vi', 'en', 'ja', 'ko'],
      },
      translations: { navigation: { home: { en: 'Home' } } },
    });
    expect(created.body).not.toHaveProperty('_id');
    expect(created.body).not.toHaveProperty('key');
    expect(created.body).not.toHaveProperty('__v');
    expect(created.body).not.toHaveProperty('createdAt');
    expect(created.body).not.toHaveProperty('updatedAt');

    const retrieved = await request(app!.getHttpServer())
      .get('/api/admin/site-settings')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(retrieved.body).toEqual(created.body);
  });

  it('updates one locale without replacing other locales or publishing drafts', async () => {
    siteSettingsState = {
      key: 'main',
      identity: { name: { vi: 'Tên cũ', en: 'Old name' } },
      localization: {
        defaultLocale: 'en',
        supportedLocales: ['vi', 'en', 'ja', 'ko'],
      },
    };
    const jwtService = app!.get(JwtService, { strict: false });
    const token = await jwtService.signAsync({
      sub: admin._id.toString(),
      role: 'admin',
    });

    const updated = await request(app!.getHttpServer())
      .patch('/api/admin/site-settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ identity: { name: { en: 'New name' } } })
      .expect(200);

    expect(siteSettingsModel.findOneAndUpdate).toHaveBeenCalledWith(
      { key: 'main' },
      { $set: { 'identity.name.en': 'New name' } },
      { new: true, runValidators: true },
    );
    expect(updated.body.identity.name).toEqual({
      vi: 'Tên cũ',
      en: 'New name',
    });

    await request(app!.getHttpServer())
      .patch('/api/admin/site-settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ published: { en: { identity: { name: 'Published' } } } })
      .expect(400);

    await request(app!.getHttpServer())
      .patch('/api/admin/site-settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ draft: { en: { identity: { name: 'Draft' } } } })
      .expect(400);
  });

  it('rejects invalid DTO values and duplicate singleton creation', async () => {
    const jwtService = app!.get(JwtService, { strict: false });
    const token = await jwtService.signAsync({
      sub: admin._id.toString(),
      role: 'admin',
    });

    await request(app!.getHttpServer())
      .post('/api/admin/site-settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ localization: { defaultLocale: 'fr' } })
      .expect(400);

    await request(app!.getHttpServer())
      .post('/api/admin/site-settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ localization: { supportedLocales: ['vi', 'en', 'ja', 'ko'] } })
      .expect(400);

    await request(app!.getHttpServer())
      .post('/api/admin/site-settings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        localization: { defaultLocale: 'en' },
        _id: 'client-controlled-id',
      })
      .expect(400);

    await request(app!.getHttpServer())
      .post('/api/admin/site-settings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        localization: { defaultLocale: 'en' },
        translations: { navigation: { home: { en: 'Home', fr: 'Accueil' } } },
      })
      .expect(400);

    await request(app!.getHttpServer())
      .post('/api/admin/site-settings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        localization: { defaultLocale: 'en' },
        contact: { socialLinks: { '$set': 'unexpected' } },
      })
      .expect(400);

    await request(app!.getHttpServer())
      .post('/api/admin/site-settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ localization: { defaultLocale: 'en' } })
      .expect(201);

    await request(app!.getHttpServer())
      .post('/api/admin/site-settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ localization: { defaultLocale: 'en' } })
      .expect(409);
  });
});
