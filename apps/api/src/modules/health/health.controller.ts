import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { HealthResponseDto } from '../../common/dto/health-response.dto';
import { MetricsService } from '../common/metrics.service';

import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Application health status' })
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth() {
    return this.healthService.getHealth();
  }

  @Get('metrics')
  @ApiOperation({
    summary: 'Aggregate application metrics without sensitive data',
  })
  getMetrics() {
    return this.metricsService.getSnapshot();
  }
}
