import { ApiProperty } from '@nestjs/swagger';

class DependencyStatusDto {
  @ApiProperty({ enum: ['up', 'down'] })
  postgres!: 'up' | 'down';

  @ApiProperty({ enum: ['up', 'down'] })
  redis!: 'up' | 'down';
}

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok', 'degraded'] })
  status!: 'ok' | 'degraded';

  @ApiProperty({ example: 'api' })
  service!: 'api';

  @ApiProperty({ example: 'v1' })
  version!: 'v1';

  @ApiProperty({ format: 'date-time' })
  timestamp!: string;

  @ApiProperty({ type: DependencyStatusDto })
  dependencies!: DependencyStatusDto;
}
