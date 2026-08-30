import { Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { LikesService } from './likes.service';

@Controller('prompt-repositories')
@UseGuards(AccessTokenGuard)
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post(':slug/like')
  like(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.likesService.like(user.id, slug);
  }

  @Delete(':slug/like')
  unlike(@Param('slug') slug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.likesService.unlike(user.id, slug);
  }
}
