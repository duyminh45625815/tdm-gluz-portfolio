import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { PAGE_MODEL } from './page.schema.js';
import { PublicPageService } from './public-page.service.js';
import { PublicLocaleService } from '../site-settings/public-locale.service.js';

function createQuery<T>(value: T) {
  return { exec: vi.fn().mockResolvedValue(value) };
}

function createDocument(page: Record<string, unknown>) {
  return { toObject: vi.fn(() => structuredClone(page)) };
}

async function createService(page: Record<string, unknown> | null) {
  const model = {
    findOne: vi.fn(() => createQuery(page ? createDocument(page) : null)),
  };
  const localeService = {
    resolve: vi.fn().mockResolvedValue({
      locale: 'vi',
      fallbackLocale: 'en',
    }),
  };
  const moduleRef = await Test.createTestingModule({
    providers: [
      PublicPageService,
      { provide: getModelToken(PAGE_MODEL), useValue: model },
      { provide: PublicLocaleService, useValue: localeService },
    ],
  }).compile();

  return {
    service: moduleRef.get(PublicPageService),
    model,
    localeService,
    moduleRef,
  };
}

describe('PublicPageService', () => {
  it('serves published Home content with the configured locale fallback only', async () => {
    const { service, model, moduleRef } = await createService({
      slug: 'home',
      draft: { vi: { hero: { title: 'Private draft' } } },
      published: { en: { hero: { title: 'Published' } } },
      _id: 'internal-id',
      __v: 1,
    });

    try {
      await expect(service.getHomePage('vi')).resolves.toEqual({
        slug: 'home',
        locale: 'en',
        content: { hero: { title: 'Published' } },
      });
      expect(model.findOne).toHaveBeenCalledWith({ slug: 'home' });
    } finally {
      await moduleRef.close();
    }
  });

  it('serves About content in the requested locale', async () => {
    const { service, moduleRef } = await createService({
      slug: 'about',
      draft: { en: { story: { title: 'Draft' } } },
      published: { vi: { story: { title: 'Published' } } },
    });

    try {
      await expect(service.getAboutPage('vi')).resolves.toEqual({
        slug: 'about',
        locale: 'vi',
        content: { story: { title: 'Published' } },
      });
    } finally {
      await moduleRef.close();
    }
  });

  it('returns not found for missing or unpublished pages', async () => {
    const missingPage = await createService(null);
    try {
      await expect(
        missingPage.service.getHomePage(),
      ).rejects.toBeInstanceOf(NotFoundException);
    } finally {
      await missingPage.moduleRef.close();
    }

    const unpublishedPage = await createService({
      slug: 'about',
      draft: { en: { story: { title: 'Draft only' } } },
    });
    try {
      await expect(
        unpublishedPage.service.getAboutPage(),
      ).rejects.toBeInstanceOf(NotFoundException);
    } finally {
      await unpublishedPage.moduleRef.close();
    }
  });
});
