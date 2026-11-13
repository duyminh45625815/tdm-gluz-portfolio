import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SiteSettingsService } from './site-settings.service.js';
import { PublicSiteSettingsService } from './public-site-settings.service.js';

describe('PublicSiteSettingsService', () => {
  it('returns only the approved public fields', async () => {
    const siteSettingsService = {
      getCurrent: vi.fn().mockResolvedValue({
        identity: {
          name: { en: 'Portfolio' },
          title: { en: 'Developer' },
          tagline: { en: 'Building things' },
          internalNote: 'must not escape',
        },
        contact: {
          email: 'hello@example.test',
          phone: '+10000000000',
          location: { en: 'Remote' },
          socialLinks: { github: 'https://example.test/profile' },
          internalNote: 'must not escape',
        },
        localization: {
          defaultLocale: 'en',
          supportedLocales: ['vi', 'en', 'ja', 'ko'],
          internalNote: 'must not escape',
        },
        translations: {
          navigation: { home: { en: 'Home' } },
          footer: { copyright: { en: 'Copyright' } },
          shared: { contact: { en: 'Contact' } },
          internalNote: 'must not escape',
        },
        key: 'main',
        _id: 'internal-id',
        __v: 1,
        createdAt: new Date(),
      }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        PublicSiteSettingsService,
        { provide: SiteSettingsService, useValue: siteSettingsService },
      ],
    }).compile();

    try {
      await expect(
        moduleRef.get(PublicSiteSettingsService).getPublicSettings(),
      ).resolves.toEqual({
        identity: {
          name: { vi: undefined, en: 'Portfolio', ja: undefined, ko: undefined },
          title: { vi: undefined, en: 'Developer', ja: undefined, ko: undefined },
          tagline: {
            vi: undefined,
            en: 'Building things',
            ja: undefined,
            ko: undefined,
          },
        },
        contact: {
          email: 'hello@example.test',
          phone: '+10000000000',
          location: { vi: undefined, en: 'Remote', ja: undefined, ko: undefined },
          socialLinks: { github: 'https://example.test/profile' },
        },
        localization: {
          defaultLocale: 'en',
          supportedLocales: ['vi', 'en', 'ja', 'ko'],
        },
        translations: {
          navigation: {
            home: { vi: undefined, en: 'Home', ja: undefined, ko: undefined },
          },
          footer: {
            copyright: {
              vi: undefined,
              en: 'Copyright',
              ja: undefined,
              ko: undefined,
            },
          },
          shared: {
            contact: {
              vi: undefined,
              en: 'Contact',
              ja: undefined,
              ko: undefined,
            },
          },
        },
      });
      expect(siteSettingsService.getCurrent).toHaveBeenCalledOnce();
    } finally {
      await moduleRef.close();
    }
  });

  it('propagates not found when site settings are unavailable', async () => {
    const siteSettingsService = {
      getCurrent: vi.fn().mockRejectedValue(new NotFoundException()),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        PublicSiteSettingsService,
        { provide: SiteSettingsService, useValue: siteSettingsService },
      ],
    }).compile();

    try {
      await expect(
        moduleRef.get(PublicSiteSettingsService).getPublicSettings(),
      ).rejects.toBeInstanceOf(NotFoundException);
    } finally {
      await moduleRef.close();
    }
  });
});
