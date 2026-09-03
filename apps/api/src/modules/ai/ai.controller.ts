import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Get,
  Header,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

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

  @Get('usage')
  @UseGuards(OptionalAccessTokenGuard)
  @Header('Cache-Control', 'private, no-store, max-age=0')
  @Header('Pragma', 'no-cache')
  usage(@Req() request: Request, @CurrentUser() user?: AuthenticatedUser) {
    return user
      ? this.aiGenerationService.usageForUser(user.id)
      : this.aiGenerationService.usageForGuest(
          request.ip || request.socket.remoteAddress || 'unknown',
        );
  }

  @Post('generate')
  @UseGuards(OptionalAccessTokenGuard)
  generate(
    @Body() input: GeneratePromptDto,
    @Req() request: Request,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.aiGenerationService.generatePublic(
      input,
      user,
      request.ip || request.socket.remoteAddress || 'unknown',
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
