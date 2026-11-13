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

function createPageDocument(page: Record<string, unknown>) {
  return {
    toObject: vi.fn(() => structuredClone(page)),
  };
}

function readDottedValue(source: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((value, segment) => {
    if (typeof value !== 'object' || value === null) {
      return undefined;
    }
    return (value as Record<string, unknown>)[segment];
  }, source);
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

function createPageModelHarness(
  getPage: () => Record<string, unknown> | null,
  setPage: (page: Record<string, unknown> | null) => void,
) {
  function PageModel(
    this: { validate: ReturnType<typeof vi.fn> },
    _page: Record<string, unknown>,
  ) {
    this.validate = vi.fn().mockResolvedValue(undefined);
  }

  return Object.assign(PageModel, {
    init: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn(() =>
      createQuery(getPage() ? { _id: 'home-id' } : null),
    ),
    findOne: vi.fn(() => {
      const page = getPage();
      return createQuery(page ? createPageDocument(page) : null);
    }),
    create: vi.fn(async (page: Record<string, unknown>) => {
      const created = {
        ...page,
        _id: 'home-id',
        __v: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setPage(created);
      return createPageDocument(created);
    }),
    findOneAndUpdate: vi.fn(
      (
        _filter: unknown,
        update: unknown,
      ) => {
        const page = getPage();
        if (!page) {
          return createQuery(null);
        }

        let updates: Record<string, unknown>;
        if (Array.isArray(update)) {
          const setStage = update[0] as {
            $set: Record<string, unknown>;
          };
          updates = Object.fromEntries(
            Object.entries(setStage.$set).map(([path, value]) => [
              path,
              typeof value === 'string' && value.startsWith('$')
                ? readDottedValue(page, value.slice(1))
                : value,
            ]),
          );
        } else {
          updates = (update as { $set: Record<string, unknown> }).$set;
        }

        const updated = applyDottedSet(page, updates);
        setPage(updated);
        return createQuery(createPageDocument(updated));
      },
    ),
  });
}

function createProjectModelHarness(
  getProjects: () => Record<string, unknown>[],
  setProjects: (projects: Record<string, unknown>[]) => void,
) {
  function ProjectModel(
    this: { validate: ReturnType<typeof vi.fn> },
    _project: Record<string, unknown>,
  ) {
    this.validate = vi.fn().mockResolvedValue(undefined);
  }

  function queryFor<T>(value: T) {
    const query = createQuery(value);
    return Object.assign(query, {
      sort: vi.fn(() => query),
    });
  }

  return Object.assign(ProjectModel, {
    init: vi.fn().mockResolvedValue(undefined),
    find: vi.fn(() =>
      queryFor(getProjects().map((project) => createPageDocument(project))),
    ),
    findOne: vi.fn((filter: { slug: string }) =>
      queryFor(
        getProjects().find((project) => project.slug === filter.slug)
          ? createPageDocument(
              getProjects().find(
                (project) => project.slug === filter.slug,
              )!,
            )
          : null,
      ),
    ),
    create: vi.fn(async (input: Record<string, unknown>) => {
      if (getProjects().some((project) => project.slug === input.slug)) {
        throw { code: 11000 };
      }

      const project = {
        ...input,
        _id: `project-${getProjects().length + 1}`,
        __v: 0,
        presentations: {
          home: false,
          about: false,
          ...(input.presentations as Record<string, unknown> | undefined),
        },
        displayOrder:
          typeof input.displayOrder === 'number' ? input.displayOrder : 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setProjects([...getProjects(), project]);
      return createPageDocument(project);
    }),
    findOneAndUpdate: vi.fn(
      (filter: { slug: string }, update: unknown) => {
        const projects = getProjects();
        const index = projects.findIndex(
          (project) => project.slug === filter.slug,
        );
        if (index < 0) {
          return queryFor(null);
        }

        const updates = Array.isArray(update)
          ? Object.fromEntries(
              Object.entries(
                (update[0] as { $set: Record<string, unknown> }).$set,
              ).map(([path, value]) => [
                path,
                typeof value === 'string' && value.startsWith('$')
                  ? readDottedValue(projects[index], value.slice(1))
                  : value,
              ]),
            )
          : (update as { $set: Record<string, unknown> }).$set;
        const updated = applyDottedSet(projects[index], updates);
        setProjects(
          projects.map((project, projectIndex) =>
            projectIndex === index ? updated : project,
          ),
        );
        return queryFor(createPageDocument(updated));
      },
    ),
    findOneAndDelete: vi.fn((filter: { slug: string }) => {
      const projects = getProjects();
      const index = projects.findIndex(
        (project) => project.slug === filter.slug,
      );
      if (index < 0) {
        return queryFor(null);
      }

      const [deleted] = projects.splice(index, 1);
      setProjects(projects);
      return queryFor(createPageDocument(deleted));
    }),
  });
}

function createSkillGroupModelHarness(
  getSkillGroups: () => Record<string, unknown>[],
  setSkillGroups: (skillGroups: Record<string, unknown>[]) => void,
) {
  function SkillGroupModel(
    this: { validate: ReturnType<typeof vi.fn> },
    _skillGroup: Record<string, unknown>,
  ) {
    this.validate = vi.fn().mockResolvedValue(undefined);
  }

  function queryFor<T>(value: T) {
    const query = createQuery(value);
    return Object.assign(query, {
      sort: vi.fn(() => query),
    });
  }

  return Object.assign(SkillGroupModel, {
    init: vi.fn().mockResolvedValue(undefined),
    find: vi.fn(() =>
      queryFor(
        getSkillGroups().map((skillGroup) =>
          createPageDocument(skillGroup),
        ),
      ),
    ),
    findOne: vi.fn((filter: { key: string }) => {
      const skillGroup = getSkillGroups().find(
        (item) => item.key === filter.key,
      );
      return queryFor(skillGroup ? createPageDocument(skillGroup) : null);
    }),
    create: vi.fn(async (input: Record<string, unknown>) => {
      if (getSkillGroups().some((item) => item.key === input.key)) {
        throw { code: 11000 };
      }

      const skillGroup = {
        ...input,
        _id: `skill-group-${getSkillGroups().length + 1}`,
        __v: 0,
        presentations: {
          home: false,
          about: false,
          ...(input.presentations as Record<string, unknown> | undefined),
        },
        displayOrder:
          typeof input.displayOrder === 'number' ? input.displayOrder : 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setSkillGroups([...getSkillGroups(), skillGroup]);
      return createPageDocument(skillGroup);
    }),
    findOneAndUpdate: vi.fn(
      (filter: { key: string }, update: unknown) => {
        const skillGroups = getSkillGroups();
        const index = skillGroups.findIndex(
          (skillGroup) => skillGroup.key === filter.key,
        );
        if (index < 0) {
          return queryFor(null);
        }

        const updates = Array.isArray(update)
          ? Object.fromEntries(
              Object.entries(
                (update[0] as { $set: Record<string, unknown> }).$set,
              ).map(([path, value]) => [
                path,
                typeof value === 'string' && value.startsWith('$')
                  ? readDottedValue(skillGroups[index], value.slice(1))
                  : value,
              ]),
            )
          : (update as { $set: Record<string, unknown> }).$set;
        const updated = applyDottedSet(skillGroups[index], updates);
        setSkillGroups(
          skillGroups.map((skillGroup, skillGroupIndex) =>
            skillGroupIndex === index ? updated : skillGroup,
          ),
        );
        return queryFor(createPageDocument(updated));
      },
    ),
    findOneAndDelete: vi.fn((filter: { key: string }) => {
      const skillGroups = getSkillGroups();
      const index = skillGroups.findIndex(
        (skillGroup) => skillGroup.key === filter.key,
      );
      if (index < 0) {
        return queryFor(null);
      }

      const [deleted] = skillGroups.splice(index, 1);
      setSkillGroups(skillGroups);
      return queryFor(createPageDocument(deleted));
    }),
  });
}

function createEducationModelHarness(
  getRecords: () => Record<string, unknown>[],
  setRecords: (records: Record<string, unknown>[]) => void,
) {
  function EducationModel(
    this: { validate: ReturnType<typeof vi.fn> },
    _education: Record<string, unknown>,
  ) {
    this.validate = vi.fn().mockResolvedValue(undefined);
  }

  function queryFor<T>(value: T) {
    const query = createQuery(value);
    return Object.assign(query, {
      sort: vi.fn(() => query),
    });
  }

  return Object.assign(EducationModel, {
    find: vi.fn(() =>
      queryFor(getRecords().map((record) => createPageDocument(record))),
    ),
    findOne: vi.fn((filter: { _id: string }) => {
      const record = getRecords().find(
        (education) => String(education._id) === filter._id,
      );
      return queryFor(record ? createPageDocument(record) : null);
    }),
    create: vi.fn(async (input: Record<string, unknown>) => {
      const record = {
        ...input,
        _id: '507f1f77bcf86cd799439011',
        __v: 0,
        presentations: {
          home: false,
          about: false,
          ...(input.presentations as Record<string, unknown> | undefined),
        },
        displayOrder:
          typeof input.displayOrder === 'number' ? input.displayOrder : 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setRecords([...getRecords(), record]);
      return createPageDocument(record);
    }),
    findOneAndUpdate: vi.fn(
      (filter: { _id: string }, update: unknown) => {
        const records = getRecords();
        const index = records.findIndex(
          (record) => String(record._id) === filter._id,
        );
        if (index < 0) {
          return queryFor(null);
        }

        const updates = Array.isArray(update)
          ? Object.fromEntries(
              Object.entries(
                (update[0] as { $set: Record<string, unknown> }).$set,
              ).map(([path, value]) => [
                path,
                typeof value === 'string' && value.startsWith('$')
                  ? readDottedValue(records[index], value.slice(1))
                  : value,
              ]),
            )
          : (update as { $set: Record<string, unknown> }).$set;
        const updated = applyDottedSet(records[index], updates);
        setRecords(
          records.map((record, recordIndex) =>
            recordIndex === index ? updated : record,
          ),
        );
        return queryFor(createPageDocument(updated));
      },
    ),
    findOneAndDelete: vi.fn((filter: { _id: string }) => {
      const records = getRecords();
      const index = records.findIndex(
        (record) => String(record._id) === filter._id,
      );
      if (index < 0) {
        return queryFor(null);
      }

      const [deleted] = records.splice(index, 1);
      setRecords(records);
      return queryFor(createPageDocument(deleted));
    }),
  });
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App> | undefined;
  let admin: TestAdmin;
  let lookupAdmin: TestAdmin | null;
  let updatedAdmin: TestAdmin | null;
  let siteSettingsState: Record<string, unknown> | null;
  let pageState: Record<string, unknown> | null;
  let pageModel: ReturnType<typeof createPageModelHarness>;
  let projectState: Record<string, unknown>[];
  let projectModel: ReturnType<typeof createProjectModelHarness>;
  let skillGroupState: Record<string, unknown>[];
  let skillGroupModel: ReturnType<typeof createSkillGroupModelHarness>;
  let educationState: Record<string, unknown>[];
  let educationModel: ReturnType<typeof createEducationModelHarness>;
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
    pageState = null;
    projectState = [];
    skillGroupState = [];
    educationState = [];
    pageModel = createPageModelHarness(
      () => pageState,
      (page) => {
        pageState = page;
      },
    );
    projectModel = createProjectModelHarness(
      () => projectState,
      (projects) => {
        projectState = projects;
      },
    );
    skillGroupModel = createSkillGroupModelHarness(
      () => skillGroupState,
      (skillGroups) => {
        skillGroupState = skillGroups;
      },
    );
    educationModel = createEducationModelHarness(
      () => educationState,
      (records) => {
        educationState = records;
      },
    );
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
      .overrideProvider(getModelToken(PAGE_MODEL))
      .useValue(pageModel)
      .overrideProvider(getModelToken(PROJECT_MODEL))
      .useValue(projectModel)
      .overrideProvider(getModelToken(SKILL_GROUP_MODEL))
      .useValue(skillGroupModel)
      .overrideProvider(getModelToken(EDUCATION_MODEL))
      .useValue(educationModel)
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

  it('serves only approved public site settings without authentication', async () => {
    await request(app!.getHttpServer())
      .get('/api/public/site-settings')
      .expect(404);

    siteSettingsState = {
      key: 'main',
      _id: 'internal-id',
      __v: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      identity: {
        name: { en: 'Portfolio' },
        title: { en: 'Developer' },
        tagline: { en: 'Building things' },
      },
      contact: {
        email: 'hello@example.test',
        phone: '+10000000000',
        location: { en: 'Remote' },
        socialLinks: { github: 'https://example.test/profile' },
      },
      localization: {
        defaultLocale: 'en',
        supportedLocales: ['vi', 'en', 'ja', 'ko'],
      },
      translations: {
        navigation: { home: { en: 'Home' } },
        footer: { copyright: { en: 'Copyright' } },
        shared: { contact: { en: 'Contact' } },
      },
      adminOnly: { accessToken: 'must-not-escape' },
      passwordHash: 'must-not-escape',
    };

    const response = await request(app!.getHttpServer())
      .get('/api/public/site-settings')
      .expect(200);
    expect(response.body).toEqual({
      identity: {
        name: { en: 'Portfolio' },
        title: { en: 'Developer' },
        tagline: { en: 'Building things' },
      },
      contact: {
        email: 'hello@example.test',
        phone: '+10000000000',
        location: { en: 'Remote' },
        socialLinks: { github: 'https://example.test/profile' },
      },
      localization: {
        defaultLocale: 'en',
        supportedLocales: ['vi', 'en', 'ja', 'ko'],
      },
      translations: {
        navigation: { home: { en: 'Home' } },
        footer: { copyright: { en: 'Copyright' } },
        shared: { contact: { en: 'Contact' } },
      },
    });
    for (const field of [
      '_id',
      '__v',
      'key',
      'createdAt',
      'updatedAt',
      'adminOnly',
      'passwordHash',
    ]) {
      expect(response.body).not.toHaveProperty(field);
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

  it('requires an admin JWT for Home Page management routes', async () => {
    await request(app!.getHttpServer())
      .get('/api/admin/pages/home')
      .expect(401);
    await request(app!.getHttpServer())
      .post('/api/admin/pages/home')
      .expect(401);
    await request(app!.getHttpServer())
      .patch('/api/admin/pages/home/draft/en')
      .send({ hero: { title: 'Updated' } })
      .expect(401);
    await request(app!.getHttpServer())
      .post('/api/admin/pages/home/publish/en')
      .expect(401);

    const nonAdminToken = await createNonAdminToken();
    for (const [method, path, body] of [
      ['get', '/api/admin/pages/home', undefined],
      ['post', '/api/admin/pages/home', undefined],
      ['patch', '/api/admin/pages/home/draft/en', { hero: { title: 'Updated' } }],
      ['post', '/api/admin/pages/home/publish/en', undefined],
    ] as const) {
      const call = request(app!.getHttpServer())[method](path).set(
        'Authorization',
        `Bearer ${nonAdminToken}`,
      );
      if (body) {
        call.send(body);
      }
      await call.expect(401);
    }
  });

  it('retrieves Home Page draft and published locales without internal fields', async () => {
    pageState = {
      slug: 'home',
      _id: 'internal-id',
      __v: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
      draft: { vi: { hero: { title: 'Vietnamese draft' } } },
      published: { en: { hero: { title: 'English published' } } },
    };
    const jwtService = app!.get(JwtService, { strict: false });
    const token = await jwtService.signAsync({
      sub: admin._id.toString(),
      role: 'admin',
    });

    const response = await request(app!.getHttpServer())
      .get('/api/admin/pages/home')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      slug: 'home',
      draft: { vi: { hero: { title: 'Vietnamese draft' } } },
      published: { en: { hero: { title: 'English published' } } },
    });
    expect(response.body).not.toHaveProperty('_id');
    expect(response.body).not.toHaveProperty('__v');
    expect(response.body).not.toHaveProperty('createdAt');
    expect(response.body).not.toHaveProperty('updatedAt');
  });

  it('initializes the singleton Home Page and rejects duplicate creation', async () => {
    const jwtService = app!.get(JwtService, { strict: false });
    const token = await jwtService.signAsync({
      sub: admin._id.toString(),
      role: 'admin',
    });

    const created = await request(app!.getHttpServer())
      .post('/api/admin/pages/home')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(pageModel.init).toHaveBeenCalledOnce();
    expect(pageModel.exists).toHaveBeenCalledWith({ slug: 'home' });
    expect(pageModel.create).toHaveBeenCalledWith({ slug: 'home' });
    expect(created.body).toEqual({ slug: 'home' });

    await request(app!.getHttpServer())
      .post('/api/admin/pages/home')
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
  });

  it('updates only supplied draft leaves and preserves other locales and publishing', async () => {
    pageState = {
      slug: 'home',
      draft: {
        vi: {
          hero: {
            title: 'Old title',
            subtitle: 'Keep this subtitle',
            primaryAction: { label: 'Old label', href: '/old' },
          },
        },
        en: { hero: { title: 'English draft' } },
      },
      published: { en: { hero: { title: 'English published' } } },
    };
    const jwtService = app!.get(JwtService, { strict: false });
    const token = await jwtService.signAsync({
      sub: admin._id.toString(),
      role: 'admin',
    });

    const response = await request(app!.getHttpServer())
      .patch('/api/admin/pages/home/draft/vi')
      .set('Authorization', `Bearer ${token}`)
      .send({
        hero: {
          title: 'New title',
          primaryAction: { label: 'New label' },
        },
      })
      .expect(200);

    expect(pageModel.findOneAndUpdate).toHaveBeenCalledWith(
      { slug: 'home' },
      {
        $set: {
          'draft.vi.hero.title': 'New title',
          'draft.vi.hero.primaryAction.label': 'New label',
        },
      },
      { new: true, runValidators: true },
    );
    expect(pageState?.draft).toEqual({
      vi: {
        hero: {
          title: 'New title',
          subtitle: 'Keep this subtitle',
          primaryAction: { label: 'New label', href: '/old' },
        },
      },
      en: { hero: { title: 'English draft' } },
    });
    expect(response.body.draft.vi.hero).toEqual({
      title: 'New title',
      subtitle: 'Keep this subtitle',
      primaryAction: { label: 'New label', href: '/old' },
    });
    expect(response.body.draft.en).toEqual({
      hero: { title: 'English draft' },
    });
    expect(response.body.published.en).toEqual({
      hero: { title: 'English published' },
    });
  });

  it('publishes only a valid draft locale and preserves other published locales', async () => {
    pageState = {
      slug: 'home',
      draft: {
        vi: { hero: { title: 'Vietnamese draft' } },
        en: { hero: { title: 'English draft' } },
      },
      published: { en: { hero: { title: 'English published' } } },
    };
    const jwtService = app!.get(JwtService, { strict: false });
    const token = await jwtService.signAsync({
      sub: admin._id.toString(),
      role: 'admin',
    });

    const response = await request(app!.getHttpServer())
      .post('/api/admin/pages/home/publish/vi')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(pageModel.findOneAndUpdate).toHaveBeenCalledWith(
      { slug: 'home', 'draft.vi': { $type: 'object' } },
      [{ $set: { 'published.vi': '$draft.vi' } }],
      { new: true, updatePipeline: true },
    );
    expect(response.body.published).toEqual({
      vi: { hero: { title: 'Vietnamese draft' } },
      en: { hero: { title: 'English published' } },
    });
    expect(response.body.draft.en).toEqual({
      hero: { title: 'English draft' },
    });
  });

  it('rejects publishing without a valid draft and invalid Home Page DTOs', async () => {
    pageState = {
      slug: 'home',
      draft: { en: { hero: { title: 'English draft' } } },
    };
    const jwtService = app!.get(JwtService, { strict: false });
    const token = await jwtService.signAsync({
      sub: admin._id.toString(),
      role: 'admin',
    });

    await request(app!.getHttpServer())
      .post('/api/admin/pages/home/publish/vi')
      .set('Authorization', `Bearer ${token}`)
      .expect(409);

    await request(app!.getHttpServer())
      .patch('/api/admin/pages/home/draft/fr')
      .set('Authorization', `Bearer ${token}`)
      .send({ hero: { title: 'Unsupported locale' } })
      .expect(400);

    await request(app!.getHttpServer())
      .patch('/api/admin/pages/home/draft/en')
      .set('Authorization', `Bearer ${token}`)
      .send({ story: { title: 'About-only section' } })
      .expect(400);

    await request(app!.getHttpServer())
      .patch('/api/admin/pages/home/draft/en')
      .set('Authorization', `Bearer ${token}`)
      .send({ hero: { primaryAction: { label: 'Go', unknown: 'field' } } })
      .expect(400);

    await request(app!.getHttpServer())
      .patch('/api/admin/pages/home/draft/en')
      .set('Authorization', `Bearer ${token}`)
      .send({ highlights: { items: [{ label: 123 }] } })
      .expect(400);

    await request(app!.getHttpServer())
      .patch('/api/admin/pages/home/draft/en')
      .set('Authorization', `Bearer ${token}`)
      .send({ _id: 'client-controlled-id', hero: { title: 'Invalid' } })
      .expect(400);
  });

  it('requires an admin JWT for About Page management routes', async () => {
    await request(app!.getHttpServer())
      .get('/api/admin/pages/about')
      .expect(401);
    await request(app!.getHttpServer())
      .post('/api/admin/pages/about')
      .expect(401);
    await request(app!.getHttpServer())
      .patch('/api/admin/pages/about/draft/en')
      .send({ story: { title: 'Updated' } })
      .expect(401);
    await request(app!.getHttpServer())
      .post('/api/admin/pages/about/publish/en')
      .expect(401);

    const nonAdminToken = await createNonAdminToken();
    for (const [method, path, body] of [
      ['get', '/api/admin/pages/about', undefined],
      ['post', '/api/admin/pages/about', undefined],
      [
        'patch',
        '/api/admin/pages/about/draft/en',
        { story: { title: 'Updated' } },
      ],
      ['post', '/api/admin/pages/about/publish/en', undefined],
    ] as const) {
      const call = request(app!.getHttpServer())[method](path).set(
        'Authorization',
        `Bearer ${nonAdminToken}`,
      );
      if (body) {
        call.send(body);
      }
      await call.expect(401);
    }
  });

  it('retrieves and initializes the About Page singleton without internal fields', async () => {
    pageState = {
      slug: 'about',
      _id: 'internal-id',
      __v: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      draft: { vi: { story: { title: 'Vietnamese draft' } } },
      published: { en: { story: { title: 'English published' } } },
    };
    const jwtService = app!.get(JwtService, { strict: false });
    const token = await jwtService.signAsync({
      sub: admin._id.toString(),
      role: 'admin',
    });

    const response = await request(app!.getHttpServer())
      .get('/api/admin/pages/about')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(response.body).toEqual({
      slug: 'about',
      draft: { vi: { story: { title: 'Vietnamese draft' } } },
      published: { en: { story: { title: 'English published' } } },
    });
    expect(response.body).not.toHaveProperty('_id');
    expect(response.body).not.toHaveProperty('__v');
    expect(response.body).not.toHaveProperty('createdAt');
    expect(response.body).not.toHaveProperty('updatedAt');

    pageState = null;
    const created = await request(app!.getHttpServer())
      .post('/api/admin/pages/about')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(pageModel.exists).toHaveBeenCalledWith({ slug: 'about' });
    expect(pageModel.create).toHaveBeenCalledWith({ slug: 'about' });
    expect(created.body).toEqual({ slug: 'about' });

    await request(app!.getHttpServer())
      .post('/api/admin/pages/about')
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
  });

  it('updates About drafts partially and publishes only the requested locale', async () => {
    pageState = {
      slug: 'about',
      draft: {
        vi: { story: { title: 'Old title', body: 'Keep this body' } },
        en: { story: { title: 'English draft' } },
      },
      published: { en: { story: { title: 'English published' } } },
    };
    const jwtService = app!.get(JwtService, { strict: false });
    const token = await jwtService.signAsync({
      sub: admin._id.toString(),
      role: 'admin',
    });

    const updated = await request(app!.getHttpServer())
      .patch('/api/admin/pages/about/draft/vi')
      .set('Authorization', `Bearer ${token}`)
      .send({ story: { title: 'New title' } })
      .expect(200);
    expect(pageState?.draft).toEqual({
      vi: { story: { title: 'New title', body: 'Keep this body' } },
      en: { story: { title: 'English draft' } },
    });
    expect(updated.body.published.en).toEqual({
      story: { title: 'English published' },
    });

    await request(app!.getHttpServer())
      .patch('/api/admin/pages/about/draft/en')
      .set('Authorization', `Bearer ${token}`)
      .send({ highlights: { title: 'Home-only section' } })
      .expect(400);
    await request(app!.getHttpServer())
      .patch('/api/admin/pages/about/draft/en')
      .set('Authorization', `Bearer ${token}`)
      .send({ story: { title: 123 } })
      .expect(400);

    const published = await request(app!.getHttpServer())
      .post('/api/admin/pages/about/publish/vi')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(pageModel.findOneAndUpdate).toHaveBeenLastCalledWith(
      { slug: 'about', 'draft.vi': { $type: 'object' } },
      [{ $set: { 'published.vi': '$draft.vi' } }],
      { new: true, updatePipeline: true },
    );
    expect(published.body.published).toEqual({
      vi: { story: { title: 'New title', body: 'Keep this body' } },
      en: { story: { title: 'English published' } },
    });
  });

  it('requires an admin JWT for Project management routes', async () => {
    await request(app!.getHttpServer()).get('/api/admin/projects').expect(401);
    await request(app!.getHttpServer())
      .post('/api/admin/projects')
      .send({ slug: 'sample-project', category: 'academic' })
      .expect(401);

    const nonAdminToken = await createNonAdminToken();
    await request(app!.getHttpServer())
      .get('/api/admin/projects')
      .set('Authorization', `Bearer ${nonAdminToken}`)
      .expect(401);
    await request(app!.getHttpServer())
      .delete('/api/admin/projects/sample-project')
      .set('Authorization', `Bearer ${nonAdminToken}`)
      .expect(401);
  });

  it('supports Project CRUD, localized drafts, publishing, and validation', async () => {
    const jwtService = app!.get(JwtService, { strict: false });
    const token = await jwtService.signAsync({
      sub: admin._id.toString(),
      role: 'admin',
    });

    const created = await request(app!.getHttpServer())
      .post('/api/admin/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        slug: 'sample-project',
        category: 'academic',
        displayOrder: 2,
        links: { github: 'https://example.test/repo', demo: '/demo' },
        presentations: { home: true, about: false },
      })
      .expect(201);
    expect(created.body).toMatchObject({
      slug: 'sample-project',
      category: 'academic',
      displayOrder: 2,
      links: { github: 'https://example.test/repo', demo: '/demo' },
      presentations: { home: true, about: false },
    });
    expect(created.body).not.toHaveProperty('_id');
    expect(created.body).not.toHaveProperty('__v');

    await request(app!.getHttpServer())
      .post('/api/admin/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ slug: 'sample-project', category: 'academic' })
      .expect(409);

    await request(app!.getHttpServer())
      .get('/api/admin/projects')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0].slug).toBe('sample-project');
      });
    await request(app!.getHttpServer())
      .get('/api/admin/projects/sample-project')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const updated = await request(app!.getHttpServer())
      .patch('/api/admin/projects/sample-project')
      .set('Authorization', `Bearer ${token}`)
      .send({
        displayOrder: 3,
        presentations: { about: true },
        links: { github: 'https://example.test/updated' },
      })
      .expect(200);
    expect(updated.body.presentations).toEqual({ home: true, about: true });
    expect(updated.body.links).toEqual({
      github: 'https://example.test/updated',
      demo: '/demo',
    });

    const draft = await request(app!.getHttpServer())
      .patch('/api/admin/projects/sample-project/draft/vi')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Vietnamese draft',
        deliverables: ['API'],
      })
      .expect(200);
    expect(draft.body.draft.vi).toEqual({
      title: 'Vietnamese draft',
      deliverables: ['API'],
    });

    const published = await request(app!.getHttpServer())
      .post('/api/admin/projects/sample-project/publish/vi')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(published.body.published.vi).toEqual(draft.body.draft.vi);

    await request(app!.getHttpServer())
      .patch('/api/admin/projects/sample-project')
      .set('Authorization', `Bearer ${token}`)
      .send({ presentations: { home: 'yes' } })
      .expect(400);
    await request(app!.getHttpServer())
      .patch('/api/admin/projects/sample-project/draft/en')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Known', unexpected: true })
      .expect(400);
    await request(app!.getHttpServer())
      .post('/api/admin/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ slug: 'Invalid Slug', category: 'academic' })
      .expect(400);

    await request(app!.getHttpServer())
      .delete('/api/admin/projects/sample-project')
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
    await request(app!.getHttpServer())
      .get('/api/admin/projects/sample-project')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('requires an admin JWT for Skill Group management routes', async () => {
    await request(app!.getHttpServer())
      .get('/api/admin/skill-groups')
      .expect(401);
    await request(app!.getHttpServer())
      .post('/api/admin/skill-groups')
      .send({ key: 'development' })
      .expect(401);

    const nonAdminToken = await createNonAdminToken();
    await request(app!.getHttpServer())
      .get('/api/admin/skill-groups')
      .set('Authorization', `Bearer ${nonAdminToken}`)
      .expect(401);
    await request(app!.getHttpServer())
      .delete('/api/admin/skill-groups/development')
      .set('Authorization', `Bearer ${nonAdminToken}`)
      .expect(401);
  });

  it('supports Skill Group CRUD, localized drafts, publishing, and validation', async () => {
    const jwtService = app!.get(JwtService, { strict: false });
    const token = await jwtService.signAsync({
      sub: admin._id.toString(),
      role: 'admin',
    });

    const created = await request(app!.getHttpServer())
      .post('/api/admin/skill-groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        key: 'development',
        displayOrder: 1,
        presentations: { home: true, about: false },
      })
      .expect(201);
    expect(created.body).toMatchObject({
      key: 'development',
      displayOrder: 1,
      presentations: { home: true, about: false },
    });
    expect(created.body).not.toHaveProperty('_id');
    expect(created.body).not.toHaveProperty('__v');

    await request(app!.getHttpServer())
      .post('/api/admin/skill-groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ key: 'development' })
      .expect(409);
    await request(app!.getHttpServer())
      .get('/api/admin/skill-groups')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0].key).toBe('development');
      });
    await request(app!.getHttpServer())
      .get('/api/admin/skill-groups/development')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const updated = await request(app!.getHttpServer())
      .patch('/api/admin/skill-groups/development')
      .set('Authorization', `Bearer ${token}`)
      .send({ displayOrder: 2, presentations: { about: true } })
      .expect(200);
    expect(updated.body.displayOrder).toBe(2);
    expect(updated.body.presentations).toEqual({ home: true, about: true });

    const draft = await request(app!.getHttpServer())
      .patch('/api/admin/skill-groups/development/draft/vi')
      .set('Authorization', `Bearer ${token}`)
      .send({ home: { title: 'Development', items: ['TypeScript', 'Node.js'] } })
      .expect(200);
    expect(draft.body.draft.vi).toEqual({
      home: { title: 'Development', items: ['TypeScript', 'Node.js'] },
    });

    const published = await request(app!.getHttpServer())
      .post('/api/admin/skill-groups/development/publish/vi')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(published.body.published.vi).toEqual(draft.body.draft.vi);

    await request(app!.getHttpServer())
      .patch('/api/admin/skill-groups/development/draft/en')
      .set('Authorization', `Bearer ${token}`)
      .send({ home: { title: 'Allowed', unknown: true } })
      .expect(400);
    await request(app!.getHttpServer())
      .patch('/api/admin/skill-groups/development')
      .set('Authorization', `Bearer ${token}`)
      .send({ presentations: { home: 'yes' } })
      .expect(400);
    await request(app!.getHttpServer())
      .post('/api/admin/skill-groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ key: 'Invalid Key' })
      .expect(400);

    await request(app!.getHttpServer())
      .delete('/api/admin/skill-groups/development')
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
    await request(app!.getHttpServer())
      .get('/api/admin/skill-groups/development')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('requires an admin JWT for Education management routes', async () => {
    await request(app!.getHttpServer()).get('/api/admin/education').expect(401);
    await request(app!.getHttpServer())
      .post('/api/admin/education')
      .send({ type: 'course' })
      .expect(401);

    const nonAdminToken = await createNonAdminToken();
    await request(app!.getHttpServer())
      .get('/api/admin/education')
      .set('Authorization', `Bearer ${nonAdminToken}`)
      .expect(401);
    await request(app!.getHttpServer())
      .delete('/api/admin/education/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${nonAdminToken}`)
      .expect(401);
  });

  it('supports Education CRUD, localized drafts, date ranges, and validation', async () => {
    const jwtService = app!.get(JwtService, { strict: false });
    const token = await jwtService.signAsync({
      sub: admin._id.toString(),
      role: 'admin',
    });

    const created = await request(app!.getHttpServer())
      .post('/api/admin/education')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'university',
        startDate: '2020-01-01',
        endDate: '2024-01-01',
        displayOrder: 1,
        presentations: { home: true, about: false },
      })
      .expect(201);
    const id = '507f1f77bcf86cd799439011';
    expect(created.body).toMatchObject({
      id,
      type: 'university',
      startDate: '2020-01-01T00:00:00.000Z',
      endDate: '2024-01-01T00:00:00.000Z',
      displayOrder: 1,
      presentations: { home: true, about: false },
    });
    expect(created.body).not.toHaveProperty('_id');
    expect(created.body).not.toHaveProperty('__v');

    await request(app!.getHttpServer())
      .post('/api/admin/education')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'course',
        startDate: '2024-01-01',
        endDate: '2020-01-01',
      })
      .expect(400);

    await request(app!.getHttpServer())
      .get('/api/admin/education')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0].id).toBe(id);
      });
    await request(app!.getHttpServer())
      .get(`/api/admin/education/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const updated = await request(app!.getHttpServer())
      .patch(`/api/admin/education/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ endDate: '2025-01-01', presentations: { about: true } })
      .expect(200);
    expect(updated.body.endDate).toBe('2025-01-01T00:00:00.000Z');
    expect(updated.body.presentations).toEqual({ home: true, about: true });

    await request(app!.getHttpServer())
      .patch(`/api/admin/education/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ startDate: '2026-01-01' })
      .expect(400);

    const draft = await request(app!.getHttpServer())
      .patch(`/api/admin/education/${id}/draft/vi`)
      .set('Authorization', `Bearer ${token}`)
      .send({ institution: 'Vietnamese university', title: 'Degree' })
      .expect(200);
    expect(draft.body.draft.vi).toEqual({
      institution: 'Vietnamese university',
      title: 'Degree',
    });
    const published = await request(app!.getHttpServer())
      .post(`/api/admin/education/${id}/publish/vi`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(published.body.published.vi).toEqual(draft.body.draft.vi);

    await request(app!.getHttpServer())
      .patch(`/api/admin/education/${id}/draft/en`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Known', unexpected: true })
      .expect(400);
    await request(app!.getHttpServer())
      .patch(`/api/admin/education/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ _id: 'client-controlled-id' })
      .expect(400);
    await request(app!.getHttpServer())
      .delete(`/api/admin/education/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
    await request(app!.getHttpServer())
      .get(`/api/admin/education/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });
});
