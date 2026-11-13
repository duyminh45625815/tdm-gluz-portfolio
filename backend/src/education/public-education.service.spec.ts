import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { EDUCATION_MODEL } from './education.schema.js';
import { PublicEducationService } from './public-education.service.js';
import { PublicLocaleService } from '../site-settings/public-locale.service.js';

function createDocument(record: Record<string, unknown>) {
  return { toObject: vi.fn(() => structuredClone(record)) };
}

function createQuery<T>(value: T) {
  const query = {
    exec: vi.fn().mockResolvedValue(value),
    sort: vi.fn(),
  };
  query.sort.mockReturnValue(query);
  return query;
}

async function createService(records: Record<string, unknown>[]) {
  const query = createQuery(records.map(createDocument));
  const model = { find: vi.fn(() => query) };
  const localeService = {
    resolve: vi.fn().mockResolvedValue({ locale: 'vi', fallbackLocale: 'en' }),
  };
  const moduleRef = await Test.createTestingModule({
    providers: [
      PublicEducationService,
      { provide: getModelToken(EDUCATION_MODEL), useValue: model },
      { provide: PublicLocaleService, useValue: localeService },
    ],
  }).compile();

  return {
    service: moduleRef.get(PublicEducationService),
    model,
    query,
    moduleRef,
  };
}

describe('PublicEducationService', () => {
  it('lists only published visible records with locale fallback and schema ordering', async () => {
    const id = '507f1f77bcf86cd799439011';
    const { service, model, query, moduleRef } = await createService([
      {
        _id: id,
        type: 'university',
        displayOrder: 1,
        startDate: new Date('2020-01-01'),
        endDate: new Date('2024-01-01'),
        presentations: { home: true, about: false },
        draft: { vi: { title: 'Draft' } },
        published: { en: { title: 'Published' } },
        __v: 1,
      },
      {
        _id: '507f1f77bcf86cd799439012',
        type: 'course',
        presentations: { home: false, about: false },
        published: { en: { title: 'Hidden' } },
      },
      {
        _id: '507f1f77bcf86cd799439013',
        type: 'certificate',
        presentations: { home: true, about: false },
        draft: { en: { title: 'Draft only' } },
      },
    ]);

    try {
      await expect(
        service.getEducationRecords('vi', 'home'),
      ).resolves.toEqual([
        {
          id,
          type: 'university',
          locale: 'en',
          content: { title: 'Published' },
          startDate: new Date('2020-01-01'),
          endDate: new Date('2024-01-01'),
          presentations: { home: true, about: false },
          displayOrder: 1,
        },
      ]);
      expect(model.find).toHaveBeenCalledWith({
        $and: [
          { 'presentations.home': true },
          {
            $or: [
              { 'published.vi': { $type: 'object' } },
              { 'published.en': { $type: 'object' } },
            ],
          },
        ],
      });
      expect(query.sort).toHaveBeenCalledWith({
        type: 1,
        displayOrder: 1,
        _id: 1,
      });
    } finally {
      await moduleRef.close();
    }
  });

  it('returns an empty list when no record is published and visible', async () => {
    const { service, moduleRef } = await createService([
      {
        _id: '507f1f77bcf86cd799439011',
        type: 'course',
        presentations: { home: false, about: false },
        published: { en: { title: 'Hidden' } },
      },
    ]);

    try {
      await expect(service.getEducationRecords()).resolves.toEqual([]);
    } finally {
      await moduleRef.close();
    }
  });
});
