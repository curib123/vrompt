import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateAdminUserDto {
  @IsOptional()
  @IsIn(['USER', 'MODERATOR', 'ADMIN'])
  role?: 'USER' | 'MODERATOR' | 'ADMIN';

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status?: 'ACTIVE' | 'SUSPENDED';

  @IsOptional()
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password?: string;
}
