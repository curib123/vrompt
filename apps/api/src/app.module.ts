import { WorkspaceModule } from './modules/workspace/workspace.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnvironment } from './config/env.schema';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { CommonModule } from './modules/common/common.module';
import { HealthModule } from './modules/health/health.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate: validateEnvironment,
    }),
    WorkspaceModule,
    CommonModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    BillingModule,
    SettingsModule,
    AuditModule,
  ],
})
export class AppModule {}
