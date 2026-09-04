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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { MonetizationService } from './monetization.service';
import { UpsertPlanDto, UpsertPromotionDto } from './dto/monetization-admin.dto';
import {
  CreateDiscountCodeDto,
  UpdateDiscountCodeDto,
} from './dto/create-discount-code.dto';

@Controller('admin/billing')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.MODERATOR, UserRole.ADMIN)
export class BillingAdminController {
  constructor(private readonly service: BillingService, private readonly monetization: MonetizationService) {}

  @Get('configuration')
  configuration() { return this.monetization.adminConfiguration(); }

  @Post('plans')
  @Roles(UserRole.ADMIN)
  createPlan(@Body() input: UpsertPlanDto, @CurrentUser() user: AuthenticatedUser) {
    return this.monetization.createPlan(input, user.id);
  }

  @Patch('plans/:id')
  @Roles(UserRole.ADMIN)
  updatePlan(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() input: UpsertPlanDto, @CurrentUser() user: AuthenticatedUser) {
    return this.monetization.updatePlan(id, input, user.id);
  }

  @Post('promotions')
  @Roles(UserRole.ADMIN)
  createPromotion(@Body() input: UpsertPromotionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.monetization.createPromotion(input, user.id);
  }

  @Patch('promotions/:id')
  @Roles(UserRole.ADMIN)
  updatePromotion(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() input: UpsertPromotionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.monetization.updatePromotion(id, input, user.id);
  }

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
