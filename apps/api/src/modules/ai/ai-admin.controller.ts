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
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AiGenerationService } from './ai-generation.service';
import { BatchGenerateDto } from './dto/batch-generate.dto';
import { GeneratePromptDto } from './dto/generate-prompt.dto';
import { ReviewGenerationDto } from './dto/review-generation.dto';

@Controller('admin/ai')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.MODERATOR, UserRole.ADMIN)
export class AiAdminController {
  constructor(private readonly aiGenerationService: AiGenerationService) {}

  @Get('generations')
  list() {
    return this.aiGenerationService.listInternal();
  }

  @Post('generate')
  generate(
    @Body() input: GeneratePromptDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiGenerationService.generateInternal(input, user);
  }

  @Post('batch')
  async batch(
    @Body() input: BatchGenerateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const results = [];
    for (const goal of input.goals) {
      try {
        results.push(
          await this.aiGenerationService.generateInternal(
            {
              goal,
              categorySlug: input.categorySlug,
              audienceSlug: input.audienceSlug,
              requestId: crypto.randomUUID(),
            },
            user,
          ),
        );
      } catch (error: unknown) {
        results.push({
          goal,
          error: error instanceof Error ? error.message : 'Generation failed',
        });
      }
    }
    return { results };
  }

  @Post('generations/:id/save-draft')
  saveDraft(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiGenerationService.saveInternalDraft(id, user.id);
  }

  @Patch('generations/:id/review')
  review(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() input: ReviewGenerationDto,
  ) {
    return this.aiGenerationService.reviewInternal(id, input.action);
  }
}
