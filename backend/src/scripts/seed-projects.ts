import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AppModule } from '../app.module.js';
import {
  PROJECT_MODEL,
  type Project,
} from '../projects/project.schema.js';

const initialProjects: Pick<Project, 'slug' | 'category' | 'displayOrder'>[] = [
  { slug: 'cinevie-plus', category: 'academic', displayOrder: 1 },
  { slug: 'gym-management', category: 'academic', displayOrder: 2 },
];

async function seedProjects(): Promise<void> {
  let app: Awaited<ReturnType<typeof NestFactory.createApplicationContext>> | undefined;

  try {
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });

    const projectModel = app.get<Model<Project>>(getModelToken(PROJECT_MODEL), {
      strict: false,
    });

    await projectModel.init();

    for (const project of initialProjects) {
      await projectModel.updateOne(
        { slug: project.slug },
        { $setOnInsert: project },
        { upsert: true },
      );
    }

    console.log('Initial academic projects are present; existing records were not modified.');
  } catch {
    console.error(
      'Project seeding failed. Check backend configuration and database availability.',
    );
    process.exitCode = 1;
  } finally {
    if (app) {
      await app.close();
    }
  }
}

await seedProjects();
