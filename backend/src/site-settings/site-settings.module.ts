import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SITE_SETTINGS_COLLECTION,
  SITE_SETTINGS_MODEL,
  SiteSettingsSchema,
} from './site-settings.schema.js';

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
  exports: [MongooseModule],
})
export class SiteSettingsModule {}
