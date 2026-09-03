import {
  Body,
  Controller,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { OptionalAccessTokenGuard } from '../auth/guards/optional-access-token.guard';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { GeneratePromptDto } from './dto/generate-prompt.dto';
import { SaveGenerationDto } from './dto/save-generation.dto';
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

  @Post('generations/:id/save')
  @UseGuards(AccessTokenGuard)
  save(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() input: SaveGenerationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.aiGenerationService.saveGeneration(id, user.id, input);
  }
}
