import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { OptionalAccessTokenGuard } from '../auth/guards/optional-access-token.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AnalyticsService } from './analytics.service';
import { AnalyticsSummaryQueryDto } from './dto/analytics-summary-query.dto';
import { TrackAnalyticsEventDto } from './dto/track-analytics-event.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('events')
  @UseGuards(OptionalAccessTokenGuard)
  track(
    @Body() input: TrackAnalyticsEventDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.analyticsService.track(input, user);
  }

  @Get('summary')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.MODERATOR, UserRole.ADMIN)
  summary(@Query() input: AnalyticsSummaryQueryDto) {
    return this.analyticsService.summary(input);
  }
}
