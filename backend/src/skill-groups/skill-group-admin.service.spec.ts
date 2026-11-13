import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Error as MongooseError } from 'mongoose';
import { SKILL_GROUP_MODEL } from './skill-group.schema.js';
import { SkillGroupAdminService } from './skill-group-admin.service.js';

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

function createDocument(skillGroup: Record<string, unknown>) {
  return {
    toObject: vi.fn(() => structuredClone(skillGroup)),
  };
}

function createModel(
  methods: Record<string, unknown>,
  validate = vi.fn().mockResolvedValue(undefined),
) {
  function SkillGroupModel(
    this: { validate: ReturnType<typeof vi.fn> },
    _skillGroup: Record<string, unknown>,
  ) {
    this.validate = validate;
  }

  return Object.assign(SkillGroupModel, methods);
}

async function createService(model: object) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      SkillGroupAdminService,
      { provide: getModelToken(SKILL_GROUP_MODEL), useValue: model },
    ],
  }).compile();

  return {
    service: moduleRef.get(SkillGroupAdminService),
    moduleRef,
  };
}

describe('SkillGroupAdminService', () => {
  it('lists localized skill groups without internal fields', async () => {
    const skillGroup = createDocument({
      key: 'development',
      displayOrder: 1,
      presentations: { home: true, about: false },
      draft: { en: { home: { title: 'Draft', items: ['TypeScript'] } } },
      published: { en: { home: { title: 'Published', items: ['JavaScript'] } } },
      _id: 'internal-id',
      __v: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const findQuery = createQuery([skillGroup]);
    const model = createModel({
      find: vi.fn(() => findQuery),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await expect(service.getSkillGroups()).resolves.toEqual([
        {
          key: 'development',
          displayOrder: 1,
          presentations: { home: true, about: false },
          draft: { en: { home: { title: 'Draft', items: ['TypeScript'] } } },
          published: {
            en: { home: { title: 'Published', items: ['JavaScript'] } },
          },
        },
      ]);
      expect(findQuery.sort).toHaveBeenCalledWith({ displayOrder: 1, key: 1 });
    } finally {
      await moduleRef.close();
    }
  });

  it('creates skill groups and maps duplicate keys to conflict', async () => {
    const skillGroup = createDocument({
      key: 'development',
      displayOrder: 0,
      presentations: { home: false, about: false },
    });
    const model = createModel({
      init: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue(skillGroup),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await expect(
        service.createSkillGroup({ key: 'development' }),
      ).resolves.toMatchObject({ key: 'development' });
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
        duplicate.service.createSkillGroup({ key: 'development' }),
      ).rejects.toBeInstanceOf(ConflictException);
    } finally {
      await duplicate.moduleRef.close();
    }
  });

  it('updates presentation flags and display order without replacing siblings', async () => {
    const updatedSkillGroup = createDocument({
      key: 'development',
      displayOrder: 4,
      presentations: { home: true, about: true },
    });
    const model = createModel({
      findOneAndUpdate: vi.fn(() => createQuery(updatedSkillGroup)),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await service.updateSkillGroup('development', {
        displayOrder: 4,
        presentations: { about: true },
      });
      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'development' },
        {
          $set: {
            displayOrder: 4,
            'presentations.about': true,
          },
        },
        { new: true, runValidators: true },
      );
    } finally {
      await moduleRef.close();
    }
  });

  it('updates localized draft leaves while preserving sibling fields and locales', async () => {
    const currentSkillGroup = createDocument({
      key: 'development',
      draft: {
        vi: { home: { title: 'Old title', items: ['Keep this'] } },
        en: { about: { title: 'English draft', items: ['English item'] } },
      },
    });
    const updatedSkillGroup = createDocument({
      key: 'development',
      draft: {
        vi: { home: { title: 'New title', items: ['Keep this'] } },
        en: { about: { title: 'English draft', items: ['English item'] } },
      },
    });
    const model = createModel({
      findOne: vi.fn(() => createQuery(currentSkillGroup)),
      findOneAndUpdate: vi.fn(() => createQuery(updatedSkillGroup)),
    });
    const { service, moduleRef } = await createService(model);

    try {
      const result = await service.updateDraft('development', 'vi', {
        home: { title: 'New title' },
      });
      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'development' },
        { $set: { 'draft.vi.home.title': 'New title' } },
        { new: true, runValidators: true },
      );
      expect(result.draft).toEqual({
        vi: { home: { title: 'New title', items: ['Keep this'] } },
        en: { about: { title: 'English draft', items: ['English item'] } },
      });
    } finally {
      await moduleRef.close();
    }
  });

  it('publishes the requested locale using a compare-and-swap filter', async () => {
    const draft = { home: { title: 'Vietnamese', items: ['Skill'] } };
    const currentSkillGroup = createDocument({
      key: 'development',
      draft: { vi: draft, en: { about: { title: 'English' } } },
      published: { en: { about: { title: 'Published English' } } },
    });
    const updatedSkillGroup = createDocument({
      key: 'development',
      draft: { vi: draft, en: { about: { title: 'English' } } },
      published: {
        vi: draft,
        en: { about: { title: 'Published English' } },
      },
    });
    const publishQuery = createQuery(updatedSkillGroup);
    const model = createModel({
      findOne: vi.fn(() => createQuery(currentSkillGroup)),
      findOneAndUpdate: vi.fn(() => publishQuery),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await service.publishLocale('development', 'vi');
      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'development', 'draft.vi': { $type: 'object' } },
        [{ $set: { 'published.vi': '$draft.vi' } }],
        { new: true, updatePipeline: true },
      );
      expect(publishQuery.setQuery).toHaveBeenCalledWith({
        key: 'development',
        $and: [
          { 'draft.vi': { $type: 'object' } },
          { 'draft.vi': { $eq: draft } },
        ],
      });
    } finally {
      await moduleRef.close();
    }
  });

  it('rejects invalid keys, empty patches, unsupported locales, and empty drafts', async () => {
    const model = createModel({
      findOneAndUpdate: vi.fn(() => createQuery(null)),
      findOne: vi.fn(() =>
        createQuery(
          createDocument({
            key: 'development',
            draft: { vi: { home: { title: '  ' } } },
          }),
        ),
      ),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await expect(
        service.updateSkillGroup('Invalid Key', { displayOrder: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.updateSkillGroup('development', {}),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.updateDraft('development', 'fr', { home: { title: 'French' } }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.publishLocale('development', 'vi'),
      ).rejects.toBeInstanceOf(ConflictException);
    } finally {
      await moduleRef.close();
    }
  });

  it('rejects schema-invalid and concurrently changed publish drafts', async () => {
    const validate = vi
      .fn()
      .mockRejectedValue(new MongooseError.ValidationError());
    const invalidModel = createModel(
      {
        findOne: vi.fn(() =>
          createQuery(
            createDocument({
              key: 'development',
              draft: { vi: { home: { title: 'Draft' } } },
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
        invalid.service.publishLocale('development', 'vi'),
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
            key: 'development',
            draft: { vi: { home: { title: 'Validated' } } },
          }),
        ),
      ),
      findOneAndUpdate: vi.fn(() => concurrentQuery),
    });
    const concurrent = await createService(concurrentModel);
    try {
      await expect(
        concurrent.service.publishLocale('development', 'vi'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(concurrentQuery.setQuery).toHaveBeenCalled();
    } finally {
      await concurrent.moduleRef.close();
    }
  });

  it('deletes skill groups and returns not found for missing keys', async () => {
    const model = createModel({
      findOneAndDelete: vi.fn(() =>
        createQuery(createDocument({ key: 'development' })),
      ),
    });
    const { service, moduleRef } = await createService(model);
    try {
      await expect(
        service.deleteSkillGroup('development'),
      ).resolves.toBeUndefined();
    } finally {
      await moduleRef.close();
    }

    const missingModel = createModel({
      findOneAndDelete: vi.fn(() => createQuery(null)),
    });
    const missing = await createService(missingModel);
    try {
      await expect(
        missing.service.deleteSkillGroup('development'),
      ).rejects.toBeInstanceOf(NotFoundException);
    } finally {
      await missing.moduleRef.close();
    }
  });
});
