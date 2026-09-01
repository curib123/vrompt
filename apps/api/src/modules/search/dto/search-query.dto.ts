import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  audience?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  aiCompatibility?: string;

  @IsOptional()
  @IsIn(['relevance', 'newest', 'updated', 'copies', 'saves', 'likes'])
  sort?: 'relevance' | 'newest' | 'updated' | 'copies' | 'saves' | 'likes';

  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;
}
