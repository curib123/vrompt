import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { MediaStorageService } from '../../common/media-storage/media-storage.service';
import type { MediaUploadInput } from '../../common/media-storage/media-storage.types';
import { PrismaService } from '../../prisma/prisma.service';

export const MAX_PROMPT_EVIDENCE_IMAGES = 3;

export interface AddPromptEvidenceImageInput extends MediaUploadInput {
  altText?: string;
  caption?: string;
  fileSize: number;
  height?: number;
  mimeType: string;
  originalFilename: string;
  sortOrder?: number;
  width?: number;
}

@Injectable()
export class PromptEvidenceImageService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mediaStorageService: MediaStorageService,
  ) {}

  async addImage(promptVersionId: string, input: AddPromptEvidenceImageInput) {
    const currentImageCount =
      await this.prismaService.promptEvidenceImage.count({
        where: { promptVersionId },
      });

    if (currentImageCount >= MAX_PROMPT_EVIDENCE_IMAGES) {
      throw new BadRequestException(
        `A prompt version can contain at most ${MAX_PROMPT_EVIDENCE_IMAGES} evidence images`,
      );
    }

    const storedMedia = await this.mediaStorageService.upload(input);

    try {
      return await this.prismaService.$transaction(
        async (transaction) => {
          const imageCount = await transaction.promptEvidenceImage.count({
            where: { promptVersionId },
          });

          if (imageCount >= MAX_PROMPT_EVIDENCE_IMAGES) {
            throw new BadRequestException(
              `A prompt version can contain at most ${MAX_PROMPT_EVIDENCE_IMAGES} evidence images`,
            );
          }

          return transaction.promptEvidenceImage.create({
            data: {
              promptVersionId,
              storageProvider: storedMedia.provider,
              storageKey: storedMedia.storageKey,
              secureUrl: storedMedia.secureUrl,
              originalFilename: input.originalFilename,
              mimeType: input.mimeType,
              fileSize: input.fileSize,
              width: input.width,
              height: input.height,
              altText: input.altText,
              caption: input.caption,
              sortOrder: input.sortOrder ?? imageCount,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error: unknown) {
      await this.mediaStorageService.delete(
        storedMedia.storageKey,
        storedMedia.provider,
      );
      throw error;
    }
  }
}
