import { Mongoose } from 'mongoose';
import { AdminUserSchema } from './admin-users/admin-user.schema.js';
import { EducationSchema } from './education/education.schema.js';
import {
  createDraftLocaleUpdate,
  createPublishLocaleUpdate,
} from './common/localized-update.utils.js';
import { PageSchema } from './pages/page.schema.js';
import { ProjectSchema } from './projects/project.schema.js';
import { SkillGroupSchema } from './skill-groups/skill-group.schema.js';
import { SiteSettingsSchema } from './site-settings/site-settings.schema.js';

describe('collection schemas', () => {
  it('allows missing translations and validates locale-specific project versions', async () => {
    const mongoose = new Mongoose();
    const ProjectModel = mongoose.model('ProjectSchemaTest', ProjectSchema);

    const withoutTranslations = new ProjectModel({
      slug: 'sample-project',
      category: 'academic',
    });
    const withTranslations = new ProjectModel({
      slug: 'localized-project',
      category: 'academic',
      draft: { en: { title: 'Draft title' } },
      published: { vi: { title: 'Published title' } },
    });

    await expect(withoutTranslations.validate()).resolves.toBeUndefined();
    await expect(withTranslations.validate()).resolves.toBeUndefined();
  });

  it('creates locale-scoped draft and publish operations', () => {
    const mongoose = new Mongoose();
    const ProjectModel = mongoose.model('ProjectLocaleUpdateTest', ProjectSchema);
    const content = { title: 'Localized title' };
    const draftUpdate = createDraftLocaleUpdate('ja', content);
    const publishUpdate = createPublishLocaleUpdate('ja');

    expect(draftUpdate).toEqual({
      $set: { 'draft.ja': content },
    });
    expect(publishUpdate).toEqual({
      filter: { 'draft.ja': { $type: 'object' } },
      options: { updatePipeline: true },
      pipeline: [{ $set: { 'published.ja': '$draft.ja' } }],
    });

    const draftQuery = ProjectModel.updateOne(
      { slug: 'sample-project' },
      draftUpdate,
      { runValidators: true },
    );
    const publishQuery = ProjectModel.updateOne(
      { slug: 'sample-project', ...publishUpdate.filter },
      publishUpdate.pipeline,
      publishUpdate.options,
    );

    expect(draftQuery.getUpdate()).toEqual(draftUpdate);
    expect(publishQuery.getUpdate()).toEqual(publishUpdate.pipeline);
  });

  it('uses the intended collection names and unique identity indexes', () => {
    expect(SiteSettingsSchema.options.collection).toBe('siteSettings');
    expect(PageSchema.options.collection).toBe('pages');
    expect(ProjectSchema.options.collection).toBe('projects');
    expect(SkillGroupSchema.options.collection).toBe('skillGroups');
    expect(EducationSchema.options.collection).toBe('education');
    expect(AdminUserSchema.options.collection).toBe('adminUsers');

    for (const [schema, key] of [
      [SiteSettingsSchema, 'key'],
      [PageSchema, 'slug'],
      [ProjectSchema, 'slug'],
      [SkillGroupSchema, 'key'],
      [AdminUserSchema, 'email'],
    ] as const) {
      expect(
        schema.indexes().some(
          ([fields, options]) => fields[key] === 1 && options.unique === true,
        ),
      ).toBe(true);
    }
  });

  it('defaults presentations to hidden and display order to zero', () => {
    const mongoose = new Mongoose();
    const ProjectModel = mongoose.model('ProjectPresentationTest', ProjectSchema);
    const SkillGroupModel = mongoose.model(
      'SkillGroupPresentationTest',
      SkillGroupSchema,
    );
    const EducationModel = mongoose.model(
      'EducationPresentationTest',
      EducationSchema,
    );

    const project = new ProjectModel({
      slug: 'sample-project',
      category: 'academic',
    });
    const skillGroup = new SkillGroupModel({ key: 'sample-skills' });
    const education = new EducationModel({ type: 'course' });

    for (const document of [project, skillGroup, education]) {
      expect(document.presentations.home).toBe(false);
      expect(document.presentations.about).toBe(false);
      expect(document.displayOrder).toBe(0);
    }
  });

  it('rejects non-integer or negative display orders', async () => {
    const mongoose = new Mongoose();
    const ProjectModel = mongoose.model('ProjectOrderTest', ProjectSchema);
    const SkillGroupModel = mongoose.model(
      'SkillGroupOrderTest',
      SkillGroupSchema,
    );
    const EducationModel = mongoose.model(
      'EducationOrderTest',
      EducationSchema,
    );
    const documents = [
      new ProjectModel({
        slug: 'sample-project',
        category: 'academic',
        displayOrder: 1.5,
      }),
      new SkillGroupModel({ key: 'sample-skills', displayOrder: -1 }),
      new EducationModel({ type: 'course', displayOrder: 2.5 }),
    ];

    for (const document of documents) {
      await expect(document.validate()).rejects.toMatchObject({
        errors: expect.objectContaining({
          displayOrder: expect.any(Object),
        }),
      });
    }
  });

  it('rejects education end dates earlier than start dates and keeps dates optional', async () => {
    const mongoose = new Mongoose();
    const EducationModel = mongoose.model('EducationDateTest', EducationSchema);
    const invalidEducation = new EducationModel({
      type: 'university',
      startDate: new Date('2024-09-01T00:00:00.000Z'),
      endDate: new Date('2024-08-31T00:00:00.000Z'),
    });
    const educationWithoutDates = new EducationModel({ type: 'course' });

    await expect(invalidEducation.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        endDate: expect.any(Object),
      }),
    });
    await expect(educationWithoutDates.validate()).resolves.toBeUndefined();
  });

  it('validates page slugs and prevents page-specific sections crossing slugs', async () => {
    const mongoose = new Mongoose();
    const PageModel = mongoose.model('PageSectionsTest', PageSchema);
    const validHomePage = new PageModel({
      slug: 'home',
      draft: { vi: { highlights: { title: 'Điểm nổi bật' } } },
    });
    const validAboutPage = new PageModel({
      slug: 'about',
      draft: { en: { story: { title: 'About the author' } } },
    });
    const invalidHomePage = new PageModel({
      slug: 'home',
      draft: { vi: { story: { title: 'Invalid on Home' } } },
    });
    const invalidAboutPage = new PageModel({
      slug: 'about',
      published: { en: { skills: { title: 'Invalid on About' } } },
    });
    const invalidSlug = new PageModel({ slug: 'contact' });

    await expect(validHomePage.validate()).resolves.toBeUndefined();
    await expect(validAboutPage.validate()).resolves.toBeUndefined();
    await expect(invalidHomePage.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        'draft.vi.story': expect.any(Object),
      }),
    });
    await expect(invalidAboutPage.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        'published.en.skills': expect.any(Object),
      }),
    });
    await expect(invalidSlug.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({ slug: expect.any(Object) }),
    });
  });

  it('requires passwordHash, excludes it from selection and serialized output', async () => {
    const mongoose = new Mongoose();
    const AdminUserModel = mongoose.model('AdminUserSchemaTest', AdminUserSchema);
    const admin = new AdminUserModel({
      email: 'admin@example.test',
      password: 'plaintext-value',
    });

    expect(AdminUserSchema.path('password')).toBeUndefined();
    expect(AdminUserSchema.path('passwordHash')?.options.select).toBe(false);
    await expect(admin.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        passwordHash: expect.any(Object),
      }),
    });

    const adminWithHash = new AdminUserModel({
      email: 'admin@example.test',
      passwordHash: 'stored-hash',
    });
    expect(adminWithHash.toJSON()).not.toHaveProperty('passwordHash');
    expect(adminWithHash.toObject()).not.toHaveProperty('passwordHash');
    await expect(adminWithHash.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        passwordHash: expect.any(Object),
      }),
    });
  });
});
