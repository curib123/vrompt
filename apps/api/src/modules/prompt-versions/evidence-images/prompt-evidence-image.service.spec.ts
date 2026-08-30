import { Test } from '@nestjs/testing';

import { MediaStorageService } from '../../common/media-storage/media-storage.service';
import { RedisService } from '../../common/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

import {
  MAX_PROMPT_EVIDENCE_IMAGES,
  PromptEvidenceImageService,
} from './prompt-evidence-image.service';

describe('PromptEvidenceImageService', () => {
  it('rejects a fourth image before storing it', async () => {
    const upload = jest.fn();
    const moduleRef = await Test.createTestingModule({
      providers: [
        PromptEvidenceImageService,
        {
          provide: PrismaService,
          useValue: {
            promptVersion: {
              findUnique: jest.fn().mockResolvedValue({
                repository: { ownerId: 'owner-id' },
              }),
            },
            promptEvidenceImage: {
              count: jest.fn().mockResolvedValue(MAX_PROMPT_EVIDENCE_IMAGES),
            },
          },
        },
        {
          provide: MediaStorageService,
          useValue: { upload },
        },
        {
          provide: RedisService,
          useValue: { increment: jest.fn().mockResolvedValue(1) },
        },
      ],
    }).compile();

    const service = moduleRef.get(PromptEvidenceImageService);

    await expect(
      service.addImage('version-id', {
        actorId: 'owner-id',
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        contentType: 'image/png',
        filename: 'preview.png',
        fileSize: 8,
        mimeType: 'image/png',
        originalFilename: 'preview.png',
      }),
    ).rejects.toThrow('at most 3 evidence images');

    expect(upload).not.toHaveBeenCalled();
  });
});
