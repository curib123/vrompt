import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class BatchGenerateDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MinLength(10, { each: true })
  @MaxLength(4000, { each: true })
  goals!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  categorySlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  audienceSlug?: string;
}
