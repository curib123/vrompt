import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ModerationActionDto {
  @IsIn(['DISMISS', 'RESOLVE', 'HIDE', 'RESTORE', 'SUSPEND'])
  action!: 'DISMISS' | 'RESOLVE' | 'HIDE' | 'RESTORE' | 'SUSPEND';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
