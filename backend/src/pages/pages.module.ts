import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PAGE_COLLECTION,
  PAGE_MODEL,
  PageSchema,
} from './page.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PAGE_MODEL, schema: PageSchema, collection: PAGE_COLLECTION },
    ]),
  ],
  exports: [MongooseModule],
})
export class PagesModule {}
