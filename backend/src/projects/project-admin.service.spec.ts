import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Error as MongooseError } from 'mongoose';
import { PROJECT_MODEL } from './project.schema.js';
import { ProjectAdminService } from './project-admin.service.js';

function createQuery<T>(value: T) {
  const query = {
    exec: vi.fn().mockResolvedValue(value),
    setQuery: vi.fn(),
    sort: vi.fn(),
  };
  query.setQuery.mockReturnValue(query);
  query.sort.mockReturnValue(query);
  return query;
}

function createDocument(project: Record<string, unknown>) {
  return {
    toObject: vi.fn(() => structuredClone(project)),
  };
}

function createModel(
  methods: Record<string, unknown>,
  validate = vi.fn().mockResolvedValue(undefined),
) {
  function ProjectModel(
    this: { validate: ReturnType<typeof vi.fn> },
    _project: Record<string, unknown>,
  ) {
    this.validate = validate;
  }

  return Object.assign(ProjectModel, methods);
}

async function createService(model: object) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      ProjectAdminService,
      { provide: getModelToken(PROJECT_MODEL), useValue: model },
    ],
  }).compile();

  return {
    service: moduleRef.get(ProjectAdminService),
    moduleRef,
  };
}

describe('ProjectAdminService', () => {
  it('lists projects in display order and returns only public project fields', async () => {
    const project = createDocument({
      slug: 'sample-project',
      category: 'academic',
      displayOrder: 2,
      presentations: { home: true, about: false },
      draft: { en: { title: 'Draft' } },
      published: { en: { title: 'Published' } },
      _id: 'internal-id',
      __v: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const findQuery = createQuery([project]);
    const model = createModel({
      find: vi.fn(() => findQuery),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await expect(service.getProjects()).resolves.toEqual([
        {
          slug: 'sample-project',
          category: 'academic',
          displayOrder: 2,
          presentations: { home: true, about: false },
          draft: { en: { title: 'Draft' } },
          published: { en: { title: 'Published' } },
          links: undefined,
        },
      ]);
      expect(findQuery.sort).toHaveBeenCalledWith({
        displayOrder: 1,
        slug: 1,
      });
    } finally {
      await moduleRef.close();
    }
  });

  it('creates a project and maps duplicate slugs to conflict', async () => {
    const project = createDocument({
      slug: 'sample-project',
      category: 'academic',
      displayOrder: 0,
      presentations: { home: false, about: false },
    });
    const model = createModel({
      init: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue(project),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await expect(
        service.createProject({
          slug: 'sample-project',
          category: 'academic',
        }),
      ).resolves.toMatchObject({
        slug: 'sample-project',
        category: 'academic',
      });
      expect(model.init).toHaveBeenCalledOnce();
    } finally {
      await moduleRef.close();
    }

    const duplicateModel = createModel({
      init: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockRejectedValue({ code: 11000 }),
    });
    const duplicate = await createService(duplicateModel);
    try {
      await expect(
        duplicate.service.createProject({
          slug: 'sample-project',
          category: 'academic',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    } finally {
      await duplicate.moduleRef.close();
    }
  });

  it('updates presentation leaves and display order without replacing siblings', async () => {
    const updatedProject = createDocument({
      slug: 'sample-project',
      category: 'professional',
      displayOrder: 5,
      presentations: { home: true, about: true },
    });
    const model = createModel({
      findOneAndUpdate: vi.fn(() => createQuery(updatedProject)),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await service.updateProject('sample-project', {
        displayOrder: 5,
        presentations: { about: true },
      });
      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { slug: 'sample-project' },
        {
          $set: {
            displayOrder: 5,
            'presentations.about': true,
          },
        },
        { new: true, runValidators: true },
      );
    } finally {
      await moduleRef.close();
    }
  });

  it('rejects empty updates, invalid slugs, and missing projects', async () => {
    const model = createModel({
      findOneAndUpdate: vi.fn(() => createQuery(null)),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await expect(
        service.updateProject('sample-project', {}),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.updateProject('Invalid Slug', { displayOrder: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.updateProject('sample-project', { displayOrder: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    } finally {
      await moduleRef.close();
    }
  });

  it('updates a localized draft without replacing other fields or locales', async () => {
    const currentProject = createDocument({
      slug: 'sample-project',
      category: 'academic',
      draft: {
        vi: { title: 'Old title', description: 'Keep this description' },
        en: { title: 'English draft' },
      },
    });
    const updatedProject = createDocument({
      slug: 'sample-project',
      category: 'academic',
      draft: {
        vi: { title: 'New title', description: 'Keep this description' },
        en: { title: 'English draft' },
      },
    });
    const model = createModel({
      findOne: vi.fn(() => createQuery(currentProject)),
      findOneAndUpdate: vi.fn(() => createQuery(updatedProject)),
    });
    const { service, moduleRef } = await createService(model);

    try {
      const result = await service.updateDraft('sample-project', 'vi', {
        title: 'New title',
      });
      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { slug: 'sample-project' },
        { $set: { 'draft.vi.title': 'New title' } },
        { new: true, runValidators: true },
      );
      expect(result.draft).toEqual({
        vi: { title: 'New title', description: 'Keep this description' },
        en: { title: 'English draft' },
      });
    } finally {
      await moduleRef.close();
    }
  });

  it('publishes the validated locale atomically and preserves other locales', async () => {
    const draft = { title: 'Vietnamese draft' };
    const currentProject = createDocument({
      slug: 'sample-project',
      category: 'academic',
      draft: { vi: draft, en: { title: 'English draft' } },
      published: { en: { title: 'English published' } },
    });
    const updatedProject = createDocument({
      slug: 'sample-project',
      category: 'academic',
      draft: { vi: draft, en: { title: 'English draft' } },
      published: { vi: draft, en: { title: 'English published' } },
    });
    const publishQuery = createQuery(updatedProject);
    const model = createModel({
      findOne: vi.fn(() => createQuery(currentProject)),
      findOneAndUpdate: vi.fn(() => publishQuery),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await service.publishLocale('sample-project', 'vi');
      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        {
          slug: 'sample-project',
          'draft.vi': { $type: 'object' },
        },
        [{ $set: { 'published.vi': '$draft.vi' } }],
        { new: true, updatePipeline: true },
      );
      expect(publishQuery.setQuery).toHaveBeenCalledWith({
        slug: 'sample-project',
        $and: [
          { 'draft.vi': { $type: 'object' } },
          { 'draft.vi': { $eq: draft } },
        ],
      });
    } finally {
      await moduleRef.close();
    }
  });

  it('rejects empty, invalid, and concurrently changed publish drafts', async () => {
    const emptyModel = createModel({
      findOne: vi.fn(() =>
        createQuery(
          createDocument({
            slug: 'sample-project',
            category: 'academic',
            draft: { vi: { title: '  ' } },
          }),
        ),
      ),
      findOneAndUpdate: vi.fn(),
    });
    const empty = await createService(emptyModel);
    try {
      await expect(
        empty.service.publishLocale('sample-project', 'vi'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(emptyModel.findOneAndUpdate).not.toHaveBeenCalled();
    } finally {
      await empty.moduleRef.close();
    }

    const validate = vi
      .fn()
      .mockRejectedValue(new MongooseError.ValidationError());
    const invalidModel = createModel(
      {
        findOne: vi.fn(() =>
          createQuery(
            createDocument({
              slug: 'sample-project',
              category: 'academic',
              draft: { vi: { title: 'Draft' } },
            }),
          ),
        ),
        findOneAndUpdate: vi.fn(),
      },
      validate,
    );
    const invalid = await createService(invalidModel);
    try {
      await expect(
        invalid.service.publishLocale('sample-project', 'vi'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(invalidModel.findOneAndUpdate).not.toHaveBeenCalled();
    } finally {
      await invalid.moduleRef.close();
    }

    const concurrentQuery = createQuery(null);
    const concurrentModel = createModel({
      findOne: vi.fn(() =>
        createQuery(
          createDocument({
            slug: 'sample-project',
            category: 'academic',
            draft: { vi: { title: 'Validated' } },
          }),
        ),
      ),
      findOneAndUpdate: vi.fn(() => concurrentQuery),
    });
    const concurrent = await createService(concurrentModel);
    try {
      await expect(
        concurrent.service.publishLocale('sample-project', 'vi'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(concurrentQuery.setQuery).toHaveBeenCalled();
    } finally {
      await concurrent.moduleRef.close();
    }
  });

  it('deletes a project and returns not found for missing projects', async () => {
    const model = createModel({
      findOneAndDelete: vi.fn(() => createQuery(createDocument({ slug: 'x' }))),
    });
    const { service, moduleRef } = await createService(model);
    try {
      await expect(service.deleteProject('sample-project')).resolves.toBeUndefined();
    } finally {
      await moduleRef.close();
    }

    const missingModel = createModel({
      findOneAndDelete: vi.fn(() => createQuery(null)),
    });
    const missing = await createService(missingModel);
    try {
      await expect(
        missing.service.deleteProject('sample-project'),
      ).rejects.toBeInstanceOf(NotFoundException);
    } finally {
      await missing.moduleRef.close();
    }
  });
});
