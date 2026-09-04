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
import { BookmarksService } from './bookmarks.service';

@Controller()
@UseGuards(AccessTokenGuard)
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Post('prompt-repositories/:slug/save')
  save(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookmarksService.save(user.id, slug);
  }

  @Delete('prompt-repositories/:slug/save')
  remove(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookmarksService.remove(user.id, slug);
  }

  @Post('prompt-repositories/:slug/use')
  use(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookmarksService.use(user.id, slug);
  }

  @Post('prompt-repositories/:slug/favorite')
  favorite(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookmarksService.setFavorite(user.id, slug, true);
  }

  @Delete('prompt-repositories/:slug/favorite')
  unfavorite(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bookmarksService.setFavorite(user.id, slug, false);
  }

  @Post('prompt-repositories/:slug/pin')
  pin(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookmarksService.setPinned(user.id, slug, true);
  }

  @Delete('prompt-repositories/:slug/pin')
  unpin(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookmarksService.setPinned(user.id, slug, false);
  }

  @Get('saved')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(12), ParseIntPipe)
    pageSize: number,
    @Query('sort') sort?: 'newest' | 'updated',
  ) {
    return this.bookmarksService.list(
      user.id,
      page,
      pageSize,
      sort === 'updated' ? 'updated' : 'newest',
    );
  }
}
