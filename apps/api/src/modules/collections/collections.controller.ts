import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { OptionalAccessTokenGuard } from '../auth/guards/optional-access-token.guard';
import { AddCollectionItemDto } from './dto/add-collection-item.dto';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { ReorderCollectionDto } from './dto/reorder-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  create(
    @Body() input: CreateCollectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionsService.create(user.id, input);
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.collectionsService.listMine(user.id);
  }

  @Get(':username/:slug')
  @UseGuards(OptionalAccessTokenGuard)
  get(
    @Param('username') username: string,
    @Param('slug') slug: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.collectionsService.get(username, slug, user?.id);
  }

  @Patch(':collectionId')
  @UseGuards(AccessTokenGuard)
  update(
    @Param('collectionId') collectionId: string,
    @Body() input: UpdateCollectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionsService.update(collectionId, user.id, input);
  }

  @Delete(':collectionId')
  @UseGuards(AccessTokenGuard)
  archive(
    @Param('collectionId') collectionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionsService.archive(collectionId, user.id);
  }

  @Post(':collectionId/items')
  @UseGuards(AccessTokenGuard)
  addItem(
    @Param('collectionId') collectionId: string,
    @Body() input: AddCollectionItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionsService.addItem(collectionId, user.id, input);
  }

  @Delete(':collectionId/items/:promptRepositoryId')
  @UseGuards(AccessTokenGuard)
  removeItem(
    @Param('collectionId') collectionId: string,
    @Param('promptRepositoryId') promptRepositoryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionsService.removeItem(
      collectionId,
      user.id,
      promptRepositoryId,
    );
  }

  @Patch(':collectionId/items/reorder')
  @UseGuards(AccessTokenGuard)
  reorder(
    @Param('collectionId') collectionId: string,
    @Body() input: ReorderCollectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionsService.reorder(collectionId, user.id, input);
  }
}
