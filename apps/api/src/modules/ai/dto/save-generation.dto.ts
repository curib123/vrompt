import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SaveGenerationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100000)
  content?: string;
}
