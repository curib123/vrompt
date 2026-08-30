import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CreatePromptRepositoryDto } from './dto/create-prompt-repository.dto';
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

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.promptsService.getBySlug(slug);
  }
}
