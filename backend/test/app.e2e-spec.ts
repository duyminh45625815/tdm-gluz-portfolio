import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { ADMIN_USER_MODEL } from './../src/admin-users/admin-user.schema.js';
import { EDUCATION_MODEL } from './../src/education/education.schema.js';
import { AppModule } from './../src/app.module.js';
import { PAGE_MODEL } from './../src/pages/page.schema.js';
import { PROJECT_MODEL } from './../src/projects/project.schema.js';
import { SITE_SETTINGS_MODEL } from './../src/site-settings/site-settings.schema.js';
import { SKILL_GROUP_MODEL } from './../src/skill-groups/skill-group.schema.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
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
        app.get(getModelToken(modelName), { strict: false }),
      ).toBeDefined();
    }
  });

  afterEach(async () => {
    await app.close();
  });
});
