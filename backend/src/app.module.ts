
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AdminUsersModule } from './admin-users/admin-users.module.js';
import { EducationModule } from './education/education.module.js';
import { HealthModule } from './health/health.module.js';
import { PagesModule } from './pages/pages.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { SiteSettingsModule } from './site-settings/site-settings.module.js';
import { SkillGroupsModule } from './skill-groups/skill-groups.module.js';

@Module({
  imports: [
    // Load environment variables from backend/.env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Connect to MongoDB Atlas
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    HealthModule,
    SiteSettingsModule,
    PagesModule,
    ProjectsModule,
    SkillGroupsModule,
    EducationModule,
    AdminUsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
