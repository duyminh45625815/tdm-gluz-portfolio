import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Error as MongooseError } from 'mongoose';
import { EDUCATION_MODEL } from './education.schema.js';
import { EducationAdminService } from './education-admin.service.js';

const EDUCATION_ID = '507f1f77bcf86cd799439011';

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

function createDocument(education: Record<string, unknown>) {
  return {
    toObject: vi.fn(() => structuredClone(education)),
  };
}

function createModel(
  methods: Record<string, unknown>,
  validate = vi.fn().mockResolvedValue(undefined),
) {
  function EducationModel(
    this: { validate: ReturnType<typeof vi.fn> },
    _education: Record<string, unknown>,
  ) {
    this.validate = validate;
  }

  return Object.assign(EducationModel, methods);
}

async function createService(model: object) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      EducationAdminService,
      { provide: getModelToken(EDUCATION_MODEL), useValue: model },
    ],
  }).compile();

  return {
    service: moduleRef.get(EducationAdminService),
    moduleRef,
  };
}

describe('EducationAdminService', () => {
  it('lists records in schema index order and returns a safe identifier', async () => {
    const record = createDocument({
      _id: EDUCATION_ID,
      type: 'university',
      displayOrder: 1,
      presentations: { home: true, about: false },
      draft: { en: { title: 'Draft' } },
      published: { en: { title: 'Published' } },
      __v: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const findQuery = createQuery([record]);
    const model = createModel({
      find: vi.fn(() => findQuery),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await expect(service.getEducationRecords()).resolves.toEqual([
        {
          id: EDUCATION_ID,
          type: 'university',
          displayOrder: 1,
          presentations: { home: true, about: false },
          draft: { en: { title: 'Draft' } },
          published: { en: { title: 'Published' } },
          startDate: undefined,
          endDate: undefined,
        },
      ]);
      expect(findQuery.sort).toHaveBeenCalledWith({
        type: 1,
        displayOrder: 1,
        _id: 1,
      });
    } finally {
      await moduleRef.close();
    }
  });

  it('creates education records and rejects an invalid date range', async () => {
    const record = createDocument({
      _id: EDUCATION_ID,
      type: 'university',
      startDate: new Date('2020-01-01'),
      endDate: new Date('2024-01-01'),
      displayOrder: 0,
    });
    const model = createModel({
      create: vi.fn().mockResolvedValue(record),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await expect(
        service.createEducationRecord({
          type: 'university',
          startDate: '2020-01-01',
          endDate: '2024-01-01',
        }),
      ).resolves.toMatchObject({ id: EDUCATION_ID, type: 'university' });
      expect(model.create).toHaveBeenCalledWith({
        type: 'university',
        startDate: new Date('2020-01-01'),
        endDate: new Date('2024-01-01'),
      });
      await expect(
        service.createEducationRecord({
          type: 'university',
          startDate: '2024-01-01',
          endDate: '2020-01-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    } finally {
      await moduleRef.close();
    }
  });

  it('updates date ranges and presentation leaves without replacing siblings', async () => {
    const currentRecord = createDocument({
      _id: EDUCATION_ID,
      type: 'university',
      startDate: new Date('2020-01-01'),
      endDate: new Date('2024-01-01'),
      presentations: { home: true, about: false },
    });
    const updatedRecord = createDocument({
      _id: EDUCATION_ID,
      type: 'university',
      startDate: new Date('2020-01-01'),
      endDate: new Date('2025-01-01'),
      presentations: { home: true, about: true },
    });
    const model = createModel({
      findOne: vi.fn(() => createQuery(currentRecord)),
      findOneAndUpdate: vi.fn(() => createQuery(updatedRecord)),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await service.updateEducationRecord(EDUCATION_ID, {
        endDate: '2025-01-01',
        presentations: { about: true },
      });
      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: EDUCATION_ID },
        {
          $set: {
            endDate: new Date('2025-01-01'),
            'presentations.about': true,
          },
        },
        { new: true, runValidators: true },
      );
    } finally {
      await moduleRef.close();
    }

    const invalidModel = createModel({
      findOne: vi.fn(() => createQuery(currentRecord)),
      findOneAndUpdate: vi.fn(),
    });
    const invalid = await createService(invalidModel);
    try {
      await expect(
        invalid.service.updateEducationRecord(EDUCATION_ID, {
          endDate: '2019-01-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(invalidModel.findOneAndUpdate).not.toHaveBeenCalled();
    } finally {
      await invalid.moduleRef.close();
    }
  });

  it('updates localized content without replacing sibling fields or locales', async () => {
    const currentRecord = createDocument({
      _id: EDUCATION_ID,
      type: 'university',
      draft: {
        vi: { title: 'Old title', institution: 'Keep this' },
        en: { title: 'English draft' },
      },
    });
    const updatedRecord = createDocument({
      _id: EDUCATION_ID,
      type: 'university',
      draft: {
        vi: { title: 'New title', institution: 'Keep this' },
        en: { title: 'English draft' },
      },
    });
    const model = createModel({
      findOne: vi.fn(() => createQuery(currentRecord)),
      findOneAndUpdate: vi.fn(() => createQuery(updatedRecord)),
    });
    const { service, moduleRef } = await createService(model);

    try {
      const result = await service.updateDraft(EDUCATION_ID, 'vi', {
        title: 'New title',
      });
      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: EDUCATION_ID },
        { $set: { 'draft.vi.title': 'New title' } },
        { new: true, runValidators: true },
      );
      expect(result.draft).toEqual({
        vi: { title: 'New title', institution: 'Keep this' },
        en: { title: 'English draft' },
      });
    } finally {
      await moduleRef.close();
    }
  });

  it('publishes only the requested locale using a compare-and-swap filter', async () => {
    const draft = { title: 'Vietnamese draft' };
    const currentRecord = createDocument({
      _id: EDUCATION_ID,
      type: 'university',
      draft: { vi: draft, en: { title: 'English draft' } },
      published: { en: { title: 'English published' } },
    });
    const updatedRecord = createDocument({
      _id: EDUCATION_ID,
      type: 'university',
      draft: { vi: draft, en: { title: 'English draft' } },
      published: { vi: draft, en: { title: 'English published' } },
    });
    const publishQuery = createQuery(updatedRecord);
    const model = createModel({
      findOne: vi.fn(() => createQuery(currentRecord)),
      findOneAndUpdate: vi.fn(() => publishQuery),
    });
    const { service, moduleRef } = await createService(model);

    try {
      await service.publishLocale(EDUCATION_ID, 'vi');
      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: EDUCATION_ID, 'draft.vi': { $type: 'object' } },
        [{ $set: { 'published.vi': '$draft.vi' } }],
        { new: true, updatePipeline: true },
      );
      expect(publishQuery.setQuery).toHaveBeenCalledWith({
        _id: EDUCATION_ID,
        $and: [
          { 'draft.vi': { $type: 'object' } },
          { 'draft.vi': { $eq: draft } },
        ],
      });
    } finally {
      await moduleRef.close();
    }
  });

  it('rejects invalid IDs, unsupported locales, empty drafts, and invalid drafts', async () => {
    const emptyModel = createModel({
      findOne: vi.fn(() =>
        createQuery(
          createDocument({
            _id: EDUCATION_ID,
            type: 'university',
            draft: { vi: { title: '  ' } },
          }),
        ),
      ),
      findOneAndUpdate: vi.fn(),
    });
    const empty = await createService(emptyModel);
    try {
      await expect(
        empty.service.getEducationRecord('invalid'),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        empty.service.updateDraft(EDUCATION_ID, 'fr', { title: 'French' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        empty.service.publishLocale(EDUCATION_ID, 'vi'),
      ).rejects.toBeInstanceOf(ConflictException);
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
              _id: EDUCATION_ID,
              type: 'university',
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
        invalid.service.publishLocale(EDUCATION_ID, 'vi'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(invalidModel.findOneAndUpdate).not.toHaveBeenCalled();
    } finally {
      await invalid.moduleRef.close();
    }
  });

  it('deletes records and returns not found for missing IDs', async () => {
    const model = createModel({
      findOneAndDelete: vi.fn(() =>
        createQuery(createDocument({ _id: EDUCATION_ID })),
      ),
    });
    const { service, moduleRef } = await createService(model);
    try {
      await expect(
        service.deleteEducationRecord(EDUCATION_ID),
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
        missing.service.deleteEducationRecord(EDUCATION_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    } finally {
      await missing.moduleRef.close();
    }
  });
});
