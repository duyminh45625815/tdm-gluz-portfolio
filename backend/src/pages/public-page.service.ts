import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { selectPublishedContent } from '../common/public-localization.utils.js';
import { PublicLocaleService } from '../site-settings/public-locale.service.js';
import {
  PAGE_MODEL,
  type AboutPageContent,
  type HomePageContent,
  type Page,
} from './page.schema.js';
import type {
  PublicAboutPageResponseDto,
  PublicHomePageResponseDto,
} from './public-page.dto.js';

@Injectable()
export class PublicPageService {
  constructor(
    @InjectModel(PAGE_MODEL)
    private readonly pages: Model<Page>,
    private readonly publicLocaleService: PublicLocaleService,
  ) {}

  async getHomePage(localeValue?: string): Promise<PublicHomePageResponseDto> {
    const selection = await this.publicLocaleService.resolve(localeValue);
    const page = await this.pages.findOne({ slug: 'home' }).exec();
    const selected = selectPublishedContent(page?.toObject().published, selection);
    if (!selected || !page) {
      throw new NotFoundException('Published Home page not found.');
    }

    return {
      slug: 'home',
      locale: selected.locale,
      content: selected.content as HomePageContent,
    };
  }

  async getAboutPage(localeValue?: string): Promise<PublicAboutPageResponseDto> {
    const selection = await this.publicLocaleService.resolve(localeValue);
    const page = await this.pages.findOne({ slug: 'about' }).exec();
    const selected = selectPublishedContent(page?.toObject().published, selection);
    if (!selected || !page) {
      throw new NotFoundException('Published About page not found.');
    }

    return {
      slug: 'about',
      locale: selected.locale,
      content: selected.content as AboutPageContent,
    };
  }
}
