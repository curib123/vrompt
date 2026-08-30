import { Test } from '@nestjs/testing';

import { MediaStorageService } from '../../common/media-storage/media-storage.service';
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
            promptEvidenceImage: {
              count: jest.fn().mockResolvedValue(MAX_PROMPT_EVIDENCE_IMAGES),
            },
          },
        },
        {
          provide: MediaStorageService,
          useValue: { upload },
        },
      ],
    }).compile();

    const service = moduleRef.get(PromptEvidenceImageService);

    await expect(
      service.addImage('version-id', {
        buffer: Buffer.from('image'),
        contentType: 'image/png',
        filename: 'preview.png',
        fileSize: 5,
        mimeType: 'image/png',
        originalFilename: 'preview.png',
      }),
    ).rejects.toThrow('at most 3 evidence images');

    expect(upload).not.toHaveBeenCalled();
  });
});
