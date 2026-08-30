import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { HealthResponseDto } from '../../common/dto/health-response.dto';

import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Application health status' })
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth() {
    return this.healthService.getHealth();
  }
}
