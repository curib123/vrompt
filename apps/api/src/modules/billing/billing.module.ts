import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import {
  BillingController,
  PayMongoWebhookController,
} from './billing.controller';
import { BillingAdminController } from './billing-admin.controller';
import { BillingService } from './billing.service';
import { PayMongoAdapter } from './paymongo.adapter';

@Module({
  imports: [AuthModule, PrismaModule, SettingsModule],
  controllers: [
    BillingController,
    BillingAdminController,
    PayMongoWebhookController,
  ],
  providers: [
    BillingService,
    PayMongoAdapter,
    { provide: 'PAYMENT_GATEWAY', useExisting: PayMongoAdapter },
  ],
  exports: [BillingService],
})
export class BillingModule {}
