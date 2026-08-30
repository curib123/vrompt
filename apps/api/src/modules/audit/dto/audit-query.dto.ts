import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

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
  ])
  action?: string;

  @IsOptional()
  @IsIn(['REPOSITORY', 'COMMENT', 'USER', 'REPORT', 'ROLE'])
  targetType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  actor?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;
}
