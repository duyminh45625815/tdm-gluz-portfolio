import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { SITE_SETTINGS_MODEL } from './site-settings.schema.js';
import { SiteSettingsService } from './site-settings.service.js';

function createQuery<T>(value: T) {
  return {
    exec: vi.fn().mockResolvedValue(value),
  };
}

function createDocument(settings: Record<string, unknown>) {
  return {
    toObject: vi.fn().mockReturnValue(settings),
  };
}

async function createService(model: object) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      SiteSettingsService,
      { provide: getModelToken(SITE_SETTINGS_MODEL), useValue: model },
    ],
  }).compile();

  return {
    service: moduleRef.get(SiteSettingsService),
    moduleRef,
  };
}

describe('SiteSettingsService', () => {
  it('retrieves only public settings fields for the singleton', async () => {
    const settings = createDocument({
      key: 'main',
      _id: 'internal-id',
      __v: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
      identity: { name: { vi: 'Tên', en: 'Name' } },
      localization: {
        defaultLocale: 'en',
        supportedLocales: ['vi', 'en', 'ja', 'ko'],
      },
    });
    const model = {
      findOne: vi.fn(() => createQuery(settings)),
    };
    const { service, moduleRef } = await createService(model);

    try {
      const result = await service.getCurrent();

      expect(model.findOne).toHaveBeenCalledWith({ key: 'main' });
      expect(result).toEqual({
        identity: { name: { vi: 'Tên', en: 'Name' } },
        localization: {
          defaultLocale: 'en',
          supportedLocales: ['vi', 'en', 'ja', 'ko'],
        },
        contact: undefined,
        translations: undefined,
      });
      expect(result).not.toHaveProperty('_id');
      expect(result).not.toHaveProperty('__v');
      expect(result).not.toHaveProperty('key');
    } finally {
      await moduleRef.close();
    }
  });

  it('returns not found when the singleton has not been created', async () => {
    const model = {
      findOne: vi.fn(() => createQuery(null)),
    };
    const { service, moduleRef } = await createService(model);

    try {
      await expect(service.getCurrent()).rejects.toBeInstanceOf(
        NotFoundException,
      );
    } finally {
      await moduleRef.close();
    }
  });

  it('creates the fixed singleton and supplies the schema locale defaults', async () => {
    const settings = createDocument({
      localization: {
        defaultLocale: 'en',
        supportedLocales: ['vi', 'en', 'ja', 'ko'],
      },
    });
    const model = {
      init: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn(() => createQuery(null)),
      create: vi.fn().mockResolvedValue(settings),
    };
    const { service, moduleRef } = await createService(model);

    try {
      await service.create({
        localization: { defaultLocale: 'en' },
      });

      expect(model.init).toHaveBeenCalledOnce();
      expect(model.exists).toHaveBeenCalledWith({ key: 'main' });
      expect(model.create).toHaveBeenCalledWith({
        key: 'main',
        identity: undefined,
        contact: undefined,
        localization: {
          defaultLocale: 'en',
          supportedLocales: ['vi', 'en', 'ja', 'ko'],
        },
        translations: undefined,
      });
    } finally {
      await moduleRef.close();
    }
  });

  it('rejects duplicate singleton creation, including a unique-index race', async () => {
    const existingModel = {
      init: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn(() => createQuery({ _id: 'existing-id' })),
      create: vi.fn(),
    };
    const existingModule = await createService(existingModel);

    try {
      await expect(
        existingModule.service.create({
          localization: { defaultLocale: 'en' },
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(existingModel.create).not.toHaveBeenCalled();
    } finally {
      await existingModule.moduleRef.close();
    }

    const raceModel = {
      init: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn(() => createQuery(null)),
      create: vi.fn().mockRejectedValue({ code: 11000 }),
    };
    const raceModule = await createService(raceModel);

    try {
      await expect(
        raceModule.service.create({
          localization: { defaultLocale: 'en' },
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    } finally {
      await raceModule.moduleRef.close();
    }
  });

  it('updates localized leaves without replacing other locales or publishing', async () => {
    const updatedSettings = createDocument({
      identity: { name: { vi: 'Tên cũ', en: 'New name' } },
      localization: {
        defaultLocale: 'en',
        supportedLocales: ['vi', 'en', 'ja', 'ko'],
      },
    });
    const model = {
      findOneAndUpdate: vi.fn(() => createQuery(updatedSettings)),
    };
    const { service, moduleRef } = await createService(model);

    try {
      await service.update({
        identity: { name: { en: 'New name' } },
        translations: { navigation: { home: { ja: 'ホーム' } } },
      });

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'main' },
        {
          $set: {
            'identity.name.en': 'New name',
            'translations.navigation.home.ja': 'ホーム',
          },
        },
        { new: true, runValidators: true },
      );
    } finally {
      await moduleRef.close();
    }
  });

  it('rejects empty updates and reports missing singleton updates', async () => {
    const model = {
      findOneAndUpdate: vi.fn(() => createQuery(null)),
    };
    const { service, moduleRef } = await createService(model);

    try {
      await expect(service.update({})).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(
        service.update({ identity: { name: { en: 'Name' } } }),
      ).rejects.toBeInstanceOf(NotFoundException);
    } finally {
      await moduleRef.close();
    }
  });
});
