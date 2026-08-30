import {
  Controller,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { ActivityService } from './activity.service';

@Controller('feed')
@UseGuards(AccessTokenGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  feed(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.activityService.feed(user.id, page, pageSize);
  }
}
