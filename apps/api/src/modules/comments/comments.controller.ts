import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { OptionalAccessTokenGuard } from '../auth/guards/optional-access-token.guard';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('prompt-repositories/:slug/comments')
  @UseGuards(OptionalAccessTokenGuard)
  list(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe)
    pageSize: number,
  ) {
    return this.commentsService.list(slug, user?.id, page, pageSize);
  }

  @Post('prompt-repositories/:slug/comments')
  @UseGuards(AccessTokenGuard)
  create(
    @Param('slug') slug: string,
    @Body() input: CreateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commentsService.create(slug, user.id, input);
  }

  @Patch('comments/:commentId')
  @UseGuards(AccessTokenGuard)
  update(
    @Param('commentId') commentId: string,
    @Body() input: UpdateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commentsService.update(commentId, user.id, input);
  }

  @Delete('comments/:commentId')
  @UseGuards(AccessTokenGuard)
  remove(
    @Param('commentId') commentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commentsService.remove(commentId, user.id);
  }
}
