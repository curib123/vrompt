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

export class AuditQueryDto {
  @IsOptional()
  @IsIn([
    'PROMPT_HIDDEN',
    'PROMPT_RESTORED',
    'COMMENT_HIDDEN',
    'USER_SUSPENDED',
    'USER_RESTORED',
    'ROLE_CHANGED',
    'REPORT_RESOLVED',
    'AUDIENCE_CREATED',
    'AUDIENCE_UPDATED',
    'AUDIENCE_ACTIVATED',
    'AUDIENCE_DEACTIVATED',
    'AUDIENCE_REORDERED',
    'SETTING_UPDATED',
    'SETTING_RESET',
  ])
  action?: string;

  @IsOptional()
  @IsIn([
    'REPOSITORY',
    'COMMENT',
    'USER',
    'REPORT',
    'ROLE',
    'AUDIENCE',
    'SETTING',
  ])
  targetType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  actor?: string;

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
