import { IsDateString, IsOptional } from 'class-validator';

export class AnalyticsSummaryQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
