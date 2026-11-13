import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SiteSettingsService } from './site-settings.service.js';
import { PublicLocaleService } from './public-locale.service.js';

describe('PublicLocaleService', () => {
  it('uses the configured default and falls back to it for requested locales', async () => {
    const siteSettingsService = {
      getCurrent: vi.fn().mockResolvedValue({
        localization: { defaultLocale: 'vi' },
      }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        PublicLocaleService,
        { provide: SiteSettingsService, useValue: siteSettingsService },
      ],
    }).compile();

    try {
      const service = moduleRef.get(PublicLocaleService);
      await expect(service.resolve()).resolves.toEqual({
        locale: 'vi',
        fallbackLocale: 'vi',
      });
      await expect(service.resolve('en')).resolves.toEqual({
        locale: 'en',
        fallbackLocale: 'vi',
      });
    } finally {
      await moduleRef.close();
    }
  });

  it('rejects unsupported requested locales', async () => {
    const siteSettingsService = {
      getCurrent: vi.fn().mockResolvedValue({
        localization: { defaultLocale: 'en' },
      }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        PublicLocaleService,
        { provide: SiteSettingsService, useValue: siteSettingsService },
      ],
    }).compile();

    try {
      await expect(
        moduleRef.get(PublicLocaleService).resolve('fr'),
      ).rejects.toBeInstanceOf(BadRequestException);
    } finally {
      await moduleRef.close();
    }
  });
});
