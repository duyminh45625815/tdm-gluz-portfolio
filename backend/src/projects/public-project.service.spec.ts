import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { PROJECT_MODEL } from './project.schema.js';
import { PublicProjectService } from './public-project.service.js';
import { PublicLocaleService } from '../site-settings/public-locale.service.js';

function createDocument(project: Record<string, unknown>) {
  return { toObject: vi.fn(() => structuredClone(project)) };
}

function createQuery<T>(value: T) {
  const query = {
    exec: vi.fn().mockResolvedValue(value),
    sort: vi.fn(),
  };
  query.sort.mockReturnValue(query);
  return query;
}

async function createService(projects: Record<string, unknown>[]) {
  const model = {
    find: vi.fn(() =>
      createQuery(projects.map((project) => createDocument(project))),
    ),
    findOne: vi.fn((filter: { slug: string }) =>
      createQuery(
        projects.find((project) => project.slug === filter.slug)
          ? createDocument(
              projects.find(
                (project) => project.slug === filter.slug,
              )!,
            )
          : null,
      ),
    ),
  };
  const localeService = {
    resolve: vi.fn().mockResolvedValue({ locale: 'vi', fallbackLocale: 'en' }),
  };
  const moduleRef = await Test.createTestingModule({
    providers: [
      PublicProjectService,
      { provide: getModelToken(PROJECT_MODEL), useValue: model },
      { provide: PublicLocaleService, useValue: localeService },
    ],
  }).compile();

  return {
    service: moduleRef.get(PublicProjectService),
    model,
    localeService,
    moduleRef,
  };
}

describe('PublicProjectService', () => {
  it('lists only published visible projects with the requested-locale fallback', async () => {
    const { service, model, moduleRef } = await createService([
      {
        slug: 'visible',
        category: 'academic',
        displayOrder: 1,
        presentations: { home: true, about: false },
        draft: { vi: { title: 'Private draft' } },
        published: { en: { title: 'Published' } },
        _id: 'internal-id',
      },
      {
        slug: 'hidden',
        category: 'personal',
        presentations: { home: false, about: false },
        published: { en: { title: 'Hidden' } },
      },
      {
        slug: 'unpublished',
        category: 'other',
        presentations: { home: true, about: false },
        draft: { en: { title: 'Draft only' } },
      },
    ]);

    try {
      await expect(
        service.getProjects('vi', 'home'),
      ).resolves.toEqual([
        {
          slug: 'visible',
          category: 'academic',
          locale: 'en',
          content: { title: 'Published' },
          links: undefined,
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
    } finally {
      await moduleRef.close();
    }
  });

  it('returns not found for hidden or unpublished project details', async () => {
    const { service, moduleRef } = await createService([
      {
        slug: 'private-project',
        category: 'personal',
        presentations: { home: false, about: false },
        published: { en: { title: 'Hidden' } },
      },
    ]);

    try {
      await expect(
        service.getProject('private-project'),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.getProject('Invalid Slug'),
      ).rejects.toBeInstanceOf(BadRequestException);
    } finally {
      await moduleRef.close();
    }
  });

  it('returns an empty list when no project is published and visible', async () => {
    const { service, moduleRef } = await createService([
      {
        slug: 'hidden-project',
        category: 'personal',
        presentations: { home: false, about: false },
        published: { en: { title: 'Hidden' } },
      },
      {
        slug: 'draft-only',
        category: 'other',
        presentations: { home: true, about: false },
        draft: { en: { title: 'Draft' } },
      },
    ]);

    try {
      await expect(service.getProjects()).resolves.toEqual([]);
    } finally {
      await moduleRef.close();
    }
  });
});
