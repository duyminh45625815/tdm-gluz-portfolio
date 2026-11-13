import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SiteSettingsModule } from '../site-settings/site-settings.module.js';
import {
  PAGE_COLLECTION,
  PAGE_MODEL,
  PageSchema,
} from './page.schema.js';
import { AboutPageController } from './about-page.controller.js';
import { AboutPageService } from './about-page.service.js';
import { HomePageController } from './home-page.controller.js';
import { HomePageService } from './home-page.service.js';
import { PublicPageController } from './public-page.controller.js';
import { PublicPageService } from './public-page.service.js';

@Module({
  imports: [
    SiteSettingsModule,
    MongooseModule.forFeature([
      { name: PAGE_MODEL, schema: PageSchema, collection: PAGE_COLLECTION },
    ]),
  ],
  controllers: [
    HomePageController,
    AboutPageController,
    PublicPageController,
  ],
  providers: [HomePageService, AboutPageService, PublicPageService],
  exports: [MongooseModule, HomePageService],
})
export class PagesModule {}
