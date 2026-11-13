import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { SKILL_GROUP_MODEL } from './skill-group.schema.js';
import { PublicSkillGroupService } from './public-skill-group.service.js';
import { PublicLocaleService } from '../site-settings/public-locale.service.js';

function createDocument(group: Record<string, unknown>) {
  return { toObject: vi.fn(() => structuredClone(group)) };
}

function createQuery<T>(value: T) {
  const query = {
    exec: vi.fn().mockResolvedValue(value),
    sort: vi.fn(),
  };
  query.sort.mockReturnValue(query);
  return query;
}

async function createService(groups: Record<string, unknown>[]) {
  const query = createQuery(groups.map(createDocument));
  const model = { find: vi.fn(() => query) };
  const localeService = {
    resolve: vi.fn().mockResolvedValue({ locale: 'vi', fallbackLocale: 'en' }),
  };
  const moduleRef = await Test.createTestingModule({
    providers: [
      PublicSkillGroupService,
      { provide: getModelToken(SKILL_GROUP_MODEL), useValue: model },
      { provide: PublicLocaleService, useValue: localeService },
    ],
  }).compile();

  return {
    service: moduleRef.get(PublicSkillGroupService),
    model,
    query,
    moduleRef,
  };
}

describe('PublicSkillGroupService', () => {
  it('lists published visible groups with locale fallback and display ordering', async () => {
    const { service, model, query, moduleRef } = await createService([
      {
        key: 'visible',
        displayOrder: 2,
        presentations: { home: false, about: true },
        draft: { vi: { about: { title: 'Draft' } } },
        published: { en: { about: { title: 'Published' } } },
        _id: 'internal-id',
      },
      {
        key: 'hidden',
        displayOrder: 1,
        presentations: { home: false, about: false },
        published: { en: { home: { title: 'Hidden' } } },
      },
      {
        key: 'unpublished',
        displayOrder: 3,
        presentations: { home: true, about: false },
        draft: { en: { home: { title: 'Draft only' } } },
      },
    ]);

    try {
      await expect(
        service.getSkillGroups('vi', 'about'),
      ).resolves.toEqual([
        {
          key: 'visible',
          locale: 'en',
          content: { about: { title: 'Published' } },
          presentations: { home: false, about: true },
          displayOrder: 2,
        },
      ]);
      expect(model.find).toHaveBeenCalledWith({
        $and: [
          { 'presentations.about': true },
          {
            $or: [
              { 'published.vi': { $type: 'object' } },
              { 'published.en': { $type: 'object' } },
            ],
          },
        ],
      });
      expect(query.sort).toHaveBeenCalledWith({ displayOrder: 1, key: 1 });
    } finally {
      await moduleRef.close();
    }
  });

  it('returns an empty list when no group is published and visible', async () => {
    const { service, moduleRef } = await createService([
      {
        key: 'hidden',
        presentations: { home: false, about: false },
        published: { en: { home: { title: 'Hidden' } } },
      },
      {
        key: 'draft-only',
        presentations: { home: true, about: false },
        draft: { en: { home: { title: 'Draft' } } },
      },
    ]);

    try {
      await expect(service.getSkillGroups()).resolves.toEqual([]);
    } finally {
      await moduleRef.close();
    }
  });
});
