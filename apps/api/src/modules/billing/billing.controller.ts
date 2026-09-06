import {
  Controller,
  Body,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';

import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { BillingService } from './billing.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { MonetizationService } from './monetization.service';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly service: BillingService,
    private readonly monetization: MonetizationService,
    private readonly config: ConfigService,
  ) {}

  @Get('plans')
  async plans() {
    const mode = this.config.get<string>('PAYMONGO_MODE', 'test');
    const key = this.config.get<string>('PAYMONGO_SECRET_KEY', '').trim();
    return {
      ...(await this.monetization.publicPlans()),
      checkoutAvailable: Boolean(
        key.startsWith(mode === 'live' ? 'sk_live_' : 'sk_test_') &&
        this.config.get<string>('PAYMONGO_WEBHOOK_SECRET', '').trim(),
      ),
      paymentMode: mode,
    };
  }

  @Post('checkout')
  @UseGuards(AccessTokenGuard)
  checkout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateCheckoutDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.service.createCheckout(
      user,
      idempotencyKey,
      input.discountCode,
      input.planCode,
    );
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.service.summary(user.id);
  }

  @Get('payments/:id')
  @UseGuards(AccessTokenGuard)
  payment(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.paymentStatus(id, user.id);
  }

  @Post('payments/:id/cancel')
  @UseGuards(AccessTokenGuard)
  cancelPayment(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.cancelPayment(id, user.id);
  }
}

@Controller('webhooks/paymongo')
export class PayMongoWebhookController {
  constructor(private readonly service: BillingService) {}

  @Post()
  webhook(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers('paymongo-signature') signature?: string,
  ) {
    return this.service.handleWebhook(
      request.rawBody ?? Buffer.from(''),
      signature,
    );
  }
}
