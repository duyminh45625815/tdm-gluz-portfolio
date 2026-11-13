import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Error as MongooseError } from 'mongoose';
import { PAGE_MODEL } from './page.schema.js';
import { HomePageService } from './home-page.service.js';

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
      HomePageService,
      { provide: getModelToken(PAGE_MODEL), useValue: model },
    ],
  }).compile();

  return {
    service: moduleRef.get(HomePageService),
    moduleRef,
  };
}

describe('HomePageService', () => {
  it('returns only the Home Page slug and localized versions', async () => {
    const page = createDocument({
      slug: 'home',
      _id: 'internal-id',
      __v: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      draft: { vi: { hero: { title: 'Draft' } } },
      published: { en: { hero: { title: 'Published' } } },
    });
    const model = createModel({
      findOne: vi.fn(() => createQuery(page)),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await expect(service.getHomePage()).resolves.toEqual({
        slug: 'home',
        draft: { vi: { hero: { title: 'Draft' } } },
        published: { en: { hero: { title: 'Published' } } },
      });
    } finally {
      await moduleRef.close();
    }
  });

  it('returns not found when Home Page has not been initialized', async () => {
    const model = createModel({
      findOne: vi.fn(() => createQuery(null)),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await expect(service.getHomePage()).rejects.toBeInstanceOf(
        NotFoundException,
      );
    } finally {
      await moduleRef.close();
    }
  });

  it('initializes the fixed Home Page slug and supplies duplicate protection', async () => {
    const page = createDocument({ slug: 'home' });
    const model = createModel({
      init: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn(() => createQuery(null)),
      create: vi.fn().mockResolvedValue(page),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await expect(service.initializeHomePage()).resolves.toEqual({
        slug: 'home',
        draft: undefined,
        published: undefined,
      });
      expect(model.init).toHaveBeenCalledOnce();
      expect(model.exists).toHaveBeenCalledWith({ slug: 'home' });
      expect(model.create).toHaveBeenCalledWith({ slug: 'home' });
    } finally {
      await moduleRef.close();
    }
  });

  it('rejects existing and concurrently created Home Page documents', async () => {
    const existingModel = createModel({
      init: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn(() => createQuery({ _id: 'existing-id' })),
      create: vi.fn(),
    });
    const existingModule = await createService(existingModel);

    try {
      await expect(
        existingModule.service.initializeHomePage(),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(existingModel.create).not.toHaveBeenCalled();
    } finally {
      await existingModule.moduleRef.close();
    }

    const raceModel = createModel({
      init: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn(() => createQuery(null)),
      create: vi.fn().mockRejectedValue({ code: 11000 }),
    });
    const raceModule = await createService(raceModel);

    try {
      await expect(
        raceModule.service.initializeHomePage(),
      ).rejects.toBeInstanceOf(ConflictException);
    } finally {
      await raceModule.moduleRef.close();
    }
  });

  it('patches one draft locale without replacing sibling fields or locales', async () => {
    const currentPage = createDocument({
      slug: 'home',
      draft: {
        vi: { hero: { title: 'Old title', subtitle: 'Keep this' } },
        en: { hero: { title: 'English title' } },
      },
    });
    const updatedPage = createDocument({
      slug: 'home',
      draft: {
        vi: { hero: { title: 'New title', subtitle: 'Keep this' } },
        en: { hero: { title: 'English title' } },
      },
    });
    const publishQuery = createQuery(updatedPage);
    const model = createModel({
      findOne: vi.fn(() => createQuery(currentPage)),
      findOneAndUpdate: vi.fn(() => publishQuery),
    });
    const { service, moduleRef } = await createService(model);

    try {
      const result = await service.updateDraft('vi', {
        hero: { title: 'New title' },
      });

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { slug: 'home' },
        { $set: { 'draft.vi.hero.title': 'New title' } },
        { new: true, runValidators: true },
      );
      expect(result.draft).toEqual({
        vi: { hero: { title: 'New title', subtitle: 'Keep this' } },
        en: { hero: { title: 'English title' } },
      });
    } finally {
      await moduleRef.close();
    }
  });

  it('rejects unsupported locales and empty draft patches', async () => {
    const model = createModel({
      findOne: vi.fn(() => createQuery(createDocument({ slug: 'home' }))),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await expect(
        service.updateDraft('fr', { hero: { title: 'Bonjour' } }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.updateDraft('en', {})).rejects.toBeInstanceOf(
        BadRequestException,
      );
    } finally {
      await moduleRef.close();
    }
  });

  it('publishes only the requested locale and preserves other published locales', async () => {
    const currentPage = createDocument({
      slug: 'home',
      draft: { vi: { hero: { title: 'Vietnamese draft' } } },
      published: { en: { hero: { title: 'English published' } } },
    });
    const updatedPage = createDocument({
      slug: 'home',
      draft: { vi: { hero: { title: 'Vietnamese draft' } } },
      published: {
        vi: { hero: { title: 'Vietnamese draft' } },
        en: { hero: { title: 'English published' } },
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
        { slug: 'home', 'draft.vi': { $type: 'object' } },
        [{ $set: { 'published.vi': '$draft.vi' } }],
        { new: true, updatePipeline: true },
      );
      expect(publishQuery.setQuery).toHaveBeenCalledWith({
        slug: 'home',
        $and: [
          { 'draft.vi': { $type: 'object' } },
          {
            'draft.vi': {
              $eq: { hero: { title: 'Vietnamese draft' } },
            },
          },
        ],
      });
    } finally {
      await moduleRef.close();
    }
  });

  it('rejects publishing when the target locale has no non-empty draft', async () => {
    const model = createModel({
      findOne: vi.fn(() =>
        createQuery(
          createDocument({
            slug: 'home',
            draft: { en: { hero: { title: 'English draft' } } },
          }),
        ),
      ),
      findOneAndUpdate: vi.fn(),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await expect(service.publishLocale('vi')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(model.findOneAndUpdate).not.toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });

  it('rejects publishing an empty draft', async () => {
    const model = createModel({
      findOne: vi.fn(() =>
        createQuery(
          createDocument({
            slug: 'home',
            draft: { vi: { hero: { title: '   ' } } },
          }),
        ),
      ),
      findOneAndUpdate: vi.fn(),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await expect(service.publishLocale('vi')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(model.findOneAndUpdate).not.toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });

  it('rejects publishing a schema-invalid draft', async () => {
    const validate = vi
      .fn()
      .mockRejectedValue(new MongooseError.ValidationError());
    const model = createModel(
      {
        findOne: vi.fn(() =>
          createQuery(
            createDocument({
              slug: 'home',
              draft: { vi: { story: { title: 'About-only section' } } },
            }),
          ),
        ),
        findOneAndUpdate: vi.fn(),
      },
      validate,
    );
    const { service, moduleRef } = await createService(model);

    try {
      await expect(service.publishLocale('vi')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(validate).toHaveBeenCalledOnce();
      expect(model.findOneAndUpdate).not.toHaveBeenCalled();
    } finally {
      await moduleRef.close();
    }
  });

  it('returns conflict when a concurrent draft edit wins the compare-and-swap', async () => {
    const draft = { hero: { title: 'Validated draft' } };
    const concurrentDraft = { hero: { title: '' } };
    const publishQuery = createQuery(null);
    publishQuery.setQuery.mockImplementation(
      (filter: {
        $and: [
          Record<string, { $type: string }>,
          Record<string, { $eq: unknown }>,
        ];
      }) => {
        const validatedDraft = filter.$and[1]['draft.vi'].$eq;
        const updatedPage = createDocument({
          slug: 'home',
          draft: { vi: concurrentDraft },
        });
        publishQuery.exec.mockResolvedValue(
          JSON.stringify(concurrentDraft) === JSON.stringify(validatedDraft)
            ? updatedPage
            : null,
        );
      },
    );
    const findOneAndUpdate = vi.fn(() => publishQuery);
    const model = createModel({
      findOne: vi.fn(() =>
        createQuery(createDocument({ slug: 'home', draft: { vi: draft } })),
      ),
      findOneAndUpdate,
    });
    const { service, moduleRef } = await createService(model);

    try {
      await expect(service.publishLocale('vi')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(findOneAndUpdate).toHaveBeenCalledWith(
        {
          slug: 'home',
          'draft.vi': { $type: 'object' },
        },
        [{ $set: { 'published.vi': '$draft.vi' } }],
        { new: true, updatePipeline: true },
      );
      expect(publishQuery.setQuery).toHaveBeenCalledWith({
        slug: 'home',
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
