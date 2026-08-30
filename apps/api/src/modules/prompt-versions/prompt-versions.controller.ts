import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PromptEvidenceImageDto } from './evidence-images/prompt-evidence-image.dto';
import { PromptEvidenceImageService } from './evidence-images/prompt-evidence-image.service';

@Controller('prompt-versions')
export class PromptVersionsController {
  constructor(
    private readonly promptEvidenceImageService: PromptEvidenceImageService,
  ) {}

  @Post(':promptVersionId/evidence-images')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(
            new BadRequestException('Evidence files must be images'),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  async addEvidenceImage(
    @Param('promptVersionId') promptVersionId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() input: PromptEvidenceImageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('An image file is required');
    }

    return this.promptEvidenceImageService.addImage(promptVersionId, {
      actorId: user.id,
      altText: input.altText,
      caption: input.caption,
      buffer: file.buffer,
      contentType: file.mimetype,
      filename: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      originalFilename: file.originalname,
      sortOrder: input.sortOrder,
    });
  }
}
