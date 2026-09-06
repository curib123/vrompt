import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { HealthResponseDto } from '../../common/dto/health-response.dto';
import { MetricsService } from '../common/metrics.service';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

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
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Aggregate application metrics without sensitive data',
  })
  getMetrics() {
    return this.metricsService.getSnapshot();
  }
}
