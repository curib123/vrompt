import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AiGenerationOperation } from '@prisma/client';

export class GeneratePromptDto {
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  goal!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  categorySlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  audienceSlug?: string;

  @IsOptional()
  @IsEnum(AiGenerationOperation)
  operation?: AiGenerationOperation;

  @IsOptional()
  @IsString()
  @MaxLength(100000)
  basePrompt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  requestId?: string;
}
