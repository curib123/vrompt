import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCheckoutDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  planCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  discountCode?: string;
}
