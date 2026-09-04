import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { Roles } from '../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BillingService } from './billing.service';
import {
  CreateDiscountCodeDto,
  UpdateDiscountCodeDto,
} from './dto/create-discount-code.dto';

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

  @Get('discounts')
  discounts() {
    return this.service.listDiscountCodes();
  }

  @Post('discounts')
  createDiscount(@Body() input: CreateDiscountCodeDto) {
    return this.service.createDiscountCode(input);
  }

  @Patch('discounts/:id')
  updateDiscount(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() input: UpdateDiscountCodeDto,
  ) {
    return this.service.updateDiscountCode(id, input);
  }
}
