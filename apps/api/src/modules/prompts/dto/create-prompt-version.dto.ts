import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import {
  PromptExampleInputDto,
  PromptVariableInputDto,
} from './create-prompt-repository.dto';

export class CreatePromptVersionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  changelog?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PromptVariableInputDto)
  variables?: PromptVariableInputDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PromptExampleInputDto)
  examples?: PromptExampleInputDto[];

  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}
