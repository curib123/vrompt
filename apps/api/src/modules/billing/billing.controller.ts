import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Get('plans')
  plans() {
    return this.service.plans();
  }

  @Post('checkout')
  @UseGuards(AccessTokenGuard)
  checkout(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.service.createCheckout(user, idempotencyKey);
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
}

@Controller('webhooks/paymongo')
export class PayMongoWebhookController {
  constructor(private readonly service: BillingService) {}

  @Post()
  webhook(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers('paymongo-signature') signature?: string,
  ) {
    return this.service.handleWebhook(request.rawBody ?? Buffer.from(''), signature);
  }
}
