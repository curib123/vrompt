import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SaveGenerationDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  saveToken?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100000)
  content?: string;
}
