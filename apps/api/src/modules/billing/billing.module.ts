import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingController, PayMongoWebhookController } from './billing.controller';
import { BillingService } from './billing.service';
import { PayMongoAdapter } from './paymongo.adapter';
import type { PaymentGatewayAdapter } from './billing.types';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [BillingController, PayMongoWebhookController],
  providers: [
    BillingService,
    PayMongoAdapter,
    { provide: 'PAYMENT_GATEWAY', useExisting: PayMongoAdapter },
  ],
  exports: [BillingService],
})
export class BillingModule {}
