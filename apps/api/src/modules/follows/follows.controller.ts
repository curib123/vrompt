import {
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { FollowsService } from './follows.service';

@Controller('profiles')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Post(':username/follow')
  @UseGuards(AccessTokenGuard)
  follow(
    @Param('username') username: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.followsService.follow(user.id, username);
  }

  @Delete(':username/follow')
  @UseGuards(AccessTokenGuard)
  unfollow(
    @Param('username') username: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.followsService.unfollow(user.id, username);
  }

  @Get(':username/followers')
  followers(
    @Param('username') username: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(30), ParseIntPipe)
    pageSize: number,
  ) {
    return this.followsService.list(username, 'followers', page, pageSize);
  }

  @Get(':username/following')
  following(
    @Param('username') username: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(30), ParseIntPipe)
    pageSize: number,
  ) {
    return this.followsService.list(username, 'following', page, pageSize);
  }
}
