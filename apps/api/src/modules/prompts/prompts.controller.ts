import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { OptionalAccessTokenGuard } from '../auth/guards/optional-access-token.guard';
import { CreatePromptRepositoryDto } from './dto/create-prompt-repository.dto';
import { CopyPromptDto } from './dto/copy-prompt.dto';
import { CreatePromptVersionDto } from './dto/create-prompt-version.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdatePromptRepositoryDto } from './dto/update-prompt-repository.dto';
import { PromptsService } from './prompts.service';

@Controller('prompt-repositories')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  create(
    @Body() input: CreatePromptRepositoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.promptsService.create(user.id, input);
  }

  @Get('mine')
  @UseGuards(AccessTokenGuard)
  listOwned(@CurrentUser() user: AuthenticatedUser) {
    return this.promptsService.listOwned(user.id);
  }

  @Get('by-id/:id')
  @UseGuards(OptionalAccessTokenGuard)
  getById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.promptsService.getById(id, user?.id);
  }

  @Post(':slug/copy')
  @UseGuards(OptionalAccessTokenGuard)
  copy(
    @Param('slug') slug: string,
    @Body() input: CopyPromptDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.promptsService.copyBySlug(slug, user?.id, input);
  }

  @Patch(':slug')
  @UseGuards(AccessTokenGuard)
  update(
    @Param('slug') slug: string,
    @Body() input: UpdatePromptRepositoryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.promptsService.updateMetadata(slug, user.id, input);
  }

  @Get(':slug/versions')
  @UseGuards(OptionalAccessTokenGuard)
  listVersions(
    @Param('slug') slug: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.promptsService.listVersions(slug, user?.id);
  }

  @Get(':slug/lineage')
  @UseGuards(OptionalAccessTokenGuard)
  getLineage(
    @Param('slug') slug: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.promptsService.getLineage(slug, user?.id);
  }

  @Get(':slug/versions/:versionNumber')
  @UseGuards(OptionalAccessTokenGuard)
  getVersion(
    @Param('slug') slug: string,
    @Param('versionNumber') versionNumber: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.promptsService.getVersion(
      slug,
      Number.parseInt(versionNumber, 10),
      user?.id,
    );
  }

  @Post(':slug/versions')
  @UseGuards(AccessTokenGuard)
  createVersion(
    @Param('slug') slug: string,
    @Body() input: CreatePromptVersionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.promptsService.createVersion(slug, user.id, input);
  }

  @Post(':slug/variants')
  @UseGuards(AccessTokenGuard)
  createVariant(
    @Param('slug') slug: string,
    @Body() input: CreateVariantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.promptsService.createVariant(slug, user.id, input);
  }

  @Get(':slug')
  @UseGuards(OptionalAccessTokenGuard)
  getBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.promptsService.getBySlug(slug, user?.id);
  }
}
