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
import { MonetizationService } from './monetization.service';

@Module({
  imports: [AuthModule, PrismaModule, SettingsModule],
  controllers: [
    BillingController,
    BillingAdminController,
    PayMongoWebhookController,
  ],
  providers: [
    BillingService,
    MonetizationService,
    PayMongoAdapter,
    { provide: 'PAYMENT_GATEWAY', useExisting: PayMongoAdapter },
  ],
  exports: [BillingService, MonetizationService],
})
export class BillingModule {}
