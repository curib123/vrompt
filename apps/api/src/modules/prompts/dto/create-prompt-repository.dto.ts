import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMaxSize,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PromptVisibility } from '@prisma/client';

export class PromptVariableInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  defaultValue?: string;

  @IsOptional()
  required?: boolean;
}

export class PromptExampleInputDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  input!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  output!: string;
}

export class CreatePromptRepositoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  categorySlug?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(8)
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  @ArrayMaxSize(5)
  audienceIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  aiCompatibility?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromptVariableInputDto)
  @ArrayMaxSize(20)
  variables?: PromptVariableInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromptExampleInputDto)
  @ArrayMaxSize(10)
  examples?: PromptExampleInputDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  changelog?: string;

  @IsOptional()
  @IsEnum(PromptVisibility)
  visibility?: PromptVisibility;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  license?: string;
}
