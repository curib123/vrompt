import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AdminUserQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsIn(['USER', 'MODERATOR', 'ADMIN'])
  role?: 'USER' | 'MODERATOR' | 'ADMIN';

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED', 'DELETED'])
  status?: 'ACTIVE' | 'SUSPENDED' | 'DELETED';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
