import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SITE_SETTINGS_COLLECTION,
  SITE_SETTINGS_MODEL,
  SiteSettingsSchema,
} from './site-settings.schema.js';
import { SiteSettingsController } from './site-settings.controller.js';
import { SiteSettingsService } from './site-settings.service.js';
import { PublicSiteSettingsController } from './public-site-settings.controller.js';
import { PublicSiteSettingsService } from './public-site-settings.service.js';
import { PublicLocaleService } from './public-locale.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: SITE_SETTINGS_MODEL,
        schema: SiteSettingsSchema,
        collection: SITE_SETTINGS_COLLECTION,
      },
    ]),
  ],
  controllers: [SiteSettingsController, PublicSiteSettingsController],
  providers: [
    SiteSettingsService,
    PublicSiteSettingsService,
    PublicLocaleService,
  ],
  exports: [MongooseModule, SiteSettingsService, PublicLocaleService],
})
export class SiteSettingsModule {}
