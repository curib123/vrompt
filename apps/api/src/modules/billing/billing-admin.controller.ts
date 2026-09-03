import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { Roles } from '../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BillingService } from './billing.service';

@Controller('admin/billing')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.MODERATOR, UserRole.ADMIN)
export class BillingAdminController {
  constructor(private readonly service: BillingService) {}

  @Get('overview')
  overview() {
    return this.service.adminOverview();
  }

  @Get('payments')
  payments() {
    return this.service.adminPayments();
  }

  @Get('webhook-failures')
  webhookFailures() {
    return this.service.adminWebhookFailures();
  }
}
