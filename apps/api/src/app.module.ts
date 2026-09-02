import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { envValidationSchema } from './config/env.schema';
import { AuditModule } from './modules/audit/audit.module';
import { ActivityModule } from './modules/activity/activity.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AudiencesModule } from './modules/audiences/audiences.module';
import { AuthModule } from './modules/auth/auth.module';
import { BookmarksModule } from './modules/bookmarks/bookmarks.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { CommentsModule } from './modules/comments/comments.module';
import { CommonModule } from './modules/common/common.module';
import { FollowsModule } from './modules/follows/follows.module';
import { HealthModule } from './modules/health/health.module';
import { LikesModule } from './modules/likes/likes.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { PromptVariantsModule } from './modules/prompt-variants/prompt-variants.module';
import { PromptVersionsModule } from './modules/prompt-versions/prompt-versions.module';
import { PromptsModule } from './modules/prompts/prompts.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SearchModule } from './modules/search/search.module';
import { SettingsModule } from './modules/settings/settings.module';
import { TagsModule } from './modules/tags/tags.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate: (configuration: Record<string, unknown>) => {
        const { error, value } = envValidationSchema.validate(configuration, {
          abortEarly: false,
          allowUnknown: true,
        });
        if (error) throw error;
        return value as Record<string, unknown>;
      },
    }),
    CommonModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ProfilesModule,
    PromptsModule,
    PromptVersionsModule,
    PromptVariantsModule,
    CategoriesModule,
    TagsModule,
    BookmarksModule,
    LikesModule,
    CommentsModule,
    FollowsModule,
    CollectionsModule,
    SearchModule,
    SettingsModule,
    NotificationsModule,
    ReportsModule,
    ModerationModule,
    AuditModule,
    ActivityModule,
    AnalyticsModule,
    AudiencesModule,
  ],
})
export class AppModule {}
