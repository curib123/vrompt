import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { OptionalAccessTokenGuard } from '../auth/guards/optional-access-token.guard';
import { ActivityService } from './activity.service';

@Controller()
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('feed')
  @UseGuards(AccessTokenGuard)
  feed(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe)
    pageSize: number,
  ) {
    return this.activityService.feed(user.id, page, pageSize);
  }

  @Get('prompt-repositories/:slug/activity')
  @UseGuards(OptionalAccessTokenGuard)
  repositoryHistory(
    @Param('slug') slug: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.activityService.repositoryHistory(slug, user?.id);
  }
}
