import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

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
  page?: number;

  @IsOptional()
  pageSize?: number;
}
