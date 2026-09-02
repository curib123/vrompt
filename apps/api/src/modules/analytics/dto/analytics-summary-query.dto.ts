import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class AnalyticsSummaryQueryDto {
  @IsOptional()
  @IsIn(['week', 'month', 'year', 'custom'])
  preset?: 'week' | 'month' | 'year' | 'custom';

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
