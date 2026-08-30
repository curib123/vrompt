import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CopyPromptDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  clientKey?: string;
}
