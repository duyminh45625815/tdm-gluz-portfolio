import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Error as MongooseError } from 'mongoose';
import { PAGE_MODEL } from './page.schema.js';
import { AboutPageService } from './about-page.service.js';

function createQuery<T>(value: T) {
  return {
    exec: vi.fn().mockResolvedValue(value),
    setQuery: vi.fn(),
  };
}

function createDocument(page: Record<string, unknown>) {
  return {
    toObject: vi.fn(() => structuredClone(page)),
  };
}

function createModel(
  methods: Record<string, unknown>,
  validate = vi.fn().mockResolvedValue(undefined),
) {
  function PageModel(
    this: { validate: ReturnType<typeof vi.fn> },
    _page: Record<string, unknown>,
  ) {
    this.validate = validate;
  }

  return Object.assign(PageModel, methods);
}

async function createService(model: object) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      AboutPageService,
      { provide: getModelToken(PAGE_MODEL), useValue: model },
    ],
  }).compile();

  return {
    service: moduleRef.get(AboutPageService),
    moduleRef,
  };
}

describe('AboutPageService', () => {
  it('returns localized content without internal MongoDB fields', async () => {
    const page = createDocument({
      slug: 'about',
      _id: 'internal-id',
      __v: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      draft: { vi: { story: { title: 'Draft' } } },
      published: { en: { story: { title: 'Published' } } },
    });
    const model = createModel({
      findOne: vi.fn(() => createQuery(page)),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await expect(service.getAboutPage()).resolves.toEqual({
        slug: 'about',
        draft: { vi: { story: { title: 'Draft' } } },
        published: { en: { story: { title: 'Published' } } },
      });
    } finally {
      await moduleRef.close();
    }
  });

  it('returns not found when About Page has not been initialized', async () => {
    const model = createModel({
      findOne: vi.fn(() => createQuery(null)),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await expect(service.getAboutPage()).rejects.toBeInstanceOf(
        NotFoundException,
      );
    } finally {
      await moduleRef.close();
    }
  });

  it('initializes the fixed About Page slug and rejects duplicate creation', async () => {
    const page = createDocument({ slug: 'about' });
    const model = createModel({
      init: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn(() => createQuery(null)),
      create: vi.fn().mockResolvedValue(page),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await expect(service.initializeAboutPage()).resolves.toEqual({
        slug: 'about',
        draft: undefined,
        published: undefined,
      });
      expect(model.init).toHaveBeenCalledOnce();
      expect(model.exists).toHaveBeenCalledWith({ slug: 'about' });
      expect(model.create).toHaveBeenCalledWith({ slug: 'about' });
    } finally {
      await moduleRef.close();
    }

    const raceModel = createModel({
      init: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn(() => createQuery(null)),
      create: vi.fn().mockRejectedValue({ code: 11000 }),
    });
    const race = await createService(raceModel);

    try {
      await expect(
        race.service.initializeAboutPage(),
      ).rejects.toBeInstanceOf(ConflictException);
    } finally {
      await race.moduleRef.close();
    }
  });

  it('updates supplied draft leaves without replacing sibling fields or locales', async () => {
    const currentPage = createDocument({
      slug: 'about',
      draft: {
        vi: { story: { title: 'Old title', body: 'Keep this' } },
        en: { story: { title: 'English draft' } },
      },
    });
    const updatedPage = createDocument({
      slug: 'about',
      draft: {
        vi: { story: { title: 'New title', body: 'Keep this' } },
        en: { story: { title: 'English draft' } },
      },
      published: { en: { story: { title: 'English published' } } },
    });
    const model = createModel({
      findOne: vi.fn(() => createQuery(currentPage)),
      findOneAndUpdate: vi.fn(() => createQuery(updatedPage)),
    });
    const { service, moduleRef } = await createService(model);

    try {
      const result = await service.updateDraft('vi', {
        story: { title: 'New title' },
      });

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { slug: 'about' },
        { $set: { 'draft.vi.story.title': 'New title' } },
        { new: true, runValidators: true },
      );
      expect(result.draft).toEqual({
        vi: { story: { title: 'New title', body: 'Keep this' } },
        en: { story: { title: 'English draft' } },
      });
      expect(result.published).toEqual({
        en: { story: { title: 'English published' } },
      });
    } finally {
      await moduleRef.close();
    }
  });

  it('rejects unsupported locales, empty patches, and missing About pages', async () => {
    const model = createModel({
      findOne: vi.fn(() => createQuery(null)),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await expect(
        service.updateDraft('fr', { story: { title: 'Bonjour' } }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.updateDraft('en', {})).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(
        service.updateDraft('en', { story: { title: 'Missing page' } }),
      ).rejects.toBeInstanceOf(NotFoundException);
    } finally {
      await moduleRef.close();
    }
  });

  it('publishes the validated draft for only the requested locale', async () => {
    const draft = { story: { title: 'Vietnamese draft' } };
    const currentPage = createDocument({
      slug: 'about',
      draft: { vi: draft, en: { story: { title: 'English draft' } } },
      published: { en: { story: { title: 'English published' } } },
    });
    const updatedPage = createDocument({
      slug: 'about',
      draft: { vi: draft, en: { story: { title: 'English draft' } } },
      published: {
        vi: draft,
        en: { story: { title: 'English published' } },
      },
    });
    const publishQuery = createQuery(updatedPage);
    const model = createModel({
      findOne: vi.fn(() => createQuery(currentPage)),
      findOneAndUpdate: vi.fn(() => publishQuery),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await service.publishLocale('vi');

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { slug: 'about', 'draft.vi': { $type: 'object' } },
        [{ $set: { 'published.vi': '$draft.vi' } }],
        { new: true, updatePipeline: true },
      );
      expect(publishQuery.setQuery).toHaveBeenCalledWith({
        slug: 'about',
        $and: [
          { 'draft.vi': { $type: 'object' } },
          { 'draft.vi': { $eq: draft } },
        ],
      });
    } finally {
      await moduleRef.close();
    }
  });

  it('rejects empty or schema-invalid drafts before publishing', async () => {
    const emptyModel = createModel({
      findOne: vi.fn(() =>
        createQuery(
          createDocument({ slug: 'about', draft: { vi: { story: {} } } }),
        ),
      ),
      findOneAndUpdate: vi.fn(),
    });
    const empty = await createService(emptyModel);

    try {
      await expect(empty.service.publishLocale('vi')).rejects.toBeInstanceOf(
        ConflictException,
      );
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
              slug: 'about',
              draft: { vi: { story: { title: 'Invalid' } } },
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
        invalid.service.publishLocale('vi'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(invalidModel.findOneAndUpdate).not.toHaveBeenCalled();
    } finally {
      await invalid.moduleRef.close();
    }
  });

  it('returns conflict if the target draft changes after validation', async () => {
    const draft = { story: { title: 'Validated draft' } };
    const publishQuery = createQuery(null);
    const findOneAndUpdate = vi.fn(() => publishQuery);
    const model = createModel({
      findOne: vi.fn(() =>
        createQuery(createDocument({ slug: 'about', draft: { vi: draft } })),
      ),
      findOneAndUpdate,
    });
    const { service, moduleRef } = await createService(model);

    try {
      await expect(service.publishLocale('vi')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(publishQuery.setQuery).toHaveBeenCalledWith({
        slug: 'about',
        $and: [
          { 'draft.vi': { $type: 'object' } },
          { 'draft.vi': { $eq: draft } },
        ],
      });
    } finally {
      await moduleRef.close();
    }
  });
});
