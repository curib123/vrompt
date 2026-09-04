import { BillingInterval, DiscountType, PromotionMode, UsageResetPeriod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID,
  Max, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';

export class PlanLimitDto {
  @IsString() @MinLength(2) @MaxLength(80) featureKey!: string;
  @IsString() @MinLength(1) @MaxLength(120) featureName!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() @MaxLength(40) unitLabel?: string;
  @IsEnum(UsageResetPeriod) resetPeriod!: UsageResetPeriod;
  @IsOptional() @IsInt() @Min(1) limit?: number | null;
  @IsOptional() @IsInt() @Min(1) @Max(100) warningAt?: number;
}

export class UpsertPlanDto {
  @IsString() @MinLength(2) @MaxLength(50) code!: string;
  @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @IsString() @MinLength(1) @MaxLength(2000) description!: string;
  @IsInt() @Min(0) originalPrice!: number;
  @IsString() @MinLength(3) @MaxLength(3) currency!: string;
  @IsEnum(BillingInterval) billingInterval!: BillingInterval;
  @IsInt() @Min(1) intervalCount!: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsInt() displayOrder!: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => PlanLimitDto) limits!: PlanLimitDto[];
}

export class UpsertPromotionDto {
  @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(80) code?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsEnum(DiscountType) discountType!: DiscountType;
  @IsInt() @Min(1) discountValue!: number;
  @IsString() startsAt!: string;
  @IsString() endsAt!: string;
  @IsString() @MinLength(1) @MaxLength(64) timezone!: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsEnum(PromotionMode) mode!: PromotionMode;
  @IsOptional() @IsInt() @Min(1) maximumRedemptions?: number;
  @IsOptional() @IsInt() @Min(1) perUserRedemptionLimit?: number;
  @IsOptional() @IsBoolean() newUsersOnly?: boolean;
  @IsOptional() @IsInt() @Min(0) minimumPurchase?: number;
  @IsArray() @IsUUID('4', { each: true }) planIds!: string[];
}
