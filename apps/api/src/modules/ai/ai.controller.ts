import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { OptionalAccessTokenGuard } from '../auth/guards/optional-access-token.guard';
import { GeneratePromptDto } from './dto/generate-prompt.dto';
import { AiGenerationService } from './ai-generation.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiGenerationService: AiGenerationService) {}

  @Post('generate')
  @UseGuards(OptionalAccessTokenGuard)
  generate(
    @Body() input: GeneratePromptDto,
    @Headers('x-vrompt-client-key') clientKey: string | undefined,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.aiGenerationService.generatePublic(
      input,
      user,
      clientKey?.trim() || 'anonymous',
    );
  }
}
