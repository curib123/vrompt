import { Test } from '@nestjs/testing';

import { MediaStorageService } from '../../common/media-storage/media-storage.service';
import { RedisService } from '../../common/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

import {
  MAX_PROMPT_EVIDENCE_IMAGES,
  PromptEvidenceImageService,
} from './prompt-evidence-image.service';

describe('PromptEvidenceImageService', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

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

  it('stores the first image with owner-provided metadata', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'image-id' });
    const upload = jest.fn().mockResolvedValue({
      provider: 'LOCAL',
      storageKey: 'image-key.png',
      secureUrl: '/media/image-key.png',
    });
    const prisma = {
      promptVersion: {
        findUnique: jest.fn().mockResolvedValue({
          repository: { ownerId: 'owner-id' },
        }),
      },
      promptEvidenceImage: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn((callback: (transaction: unknown) => unknown) =>
        callback({
          promptEvidenceImage: {
            count: jest.fn().mockResolvedValue(0),
            create,
          },
        }),
      ),
    };
    const service = await createService(
      prisma,
      { upload, delete: jest.fn() },
      { increment: jest.fn().mockResolvedValue(1) },
    );

    await expect(
      service.addImage('version-id', {
        actorId: 'owner-id',
        buffer: png,
        contentType: 'image/png',
        filename: '../../preview.png',
        fileSize: png.length,
        mimeType: 'image/png',
        originalFilename: '../../preview.png',
      }),
    ).resolves.toEqual({ id: 'image-id' });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ originalFilename: 'preview.png' }),
      }),
    );
  });

  it('rejects oversized, unsupported, and unauthorized uploads', async () => {
    const makeService = (ownerId = 'owner-id') =>
      createService(
        {
          promptVersion: {
            findUnique: jest.fn().mockResolvedValue({
              repository: { ownerId },
            }),
          },
          promptEvidenceImage: { count: jest.fn().mockResolvedValue(0) },
        },
        { upload: jest.fn() },
        { increment: jest.fn().mockResolvedValue(1) },
      );

    const oversized = await makeService();
    await expect(
      oversized.addImage('version-id', {
        actorId: 'owner-id',
        buffer: png,
        contentType: 'image/png',
        filename: 'large.png',
        fileSize: 5 * 1024 * 1024 + 1,
        mimeType: 'image/png',
        originalFilename: 'large.png',
      }),
    ).rejects.toThrow('5 MB');

    const unsupported = await makeService();
    await expect(
      unsupported.addImage('version-id', {
        actorId: 'owner-id',
        buffer: Buffer.from('GIF89a'),
        contentType: 'image/gif',
        filename: 'image.gif',
        fileSize: 6,
        mimeType: 'image/gif',
        originalFilename: 'image.gif',
      }),
    ).rejects.toThrow('JPEG, PNG, or WebP');

    const unauthorized = await makeService('different-owner');
    await expect(
      unauthorized.addImage('version-id', {
        actorId: 'owner-id',
        buffer: png,
        contentType: 'image/png',
        filename: 'image.png',
        fileSize: png.length,
        mimeType: 'image/png',
        originalFilename: 'image.png',
      }),
    ).rejects.toThrow('repository owner');
  });

  it('deletes an owned image and rejects another owner', async () => {
    const deleteImage = jest.fn();
    const prisma = {
      promptEvidenceImage: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({
            storageKey: 'image-key',
            storageProvider: 'LOCAL',
            promptVersion: { repository: { ownerId: 'owner-id' } },
          })
          .mockResolvedValueOnce({
            storageKey: 'image-key',
            storageProvider: 'LOCAL',
            promptVersion: { repository: { ownerId: 'owner-id' } },
          }),
        delete: jest.fn(),
      },
    };
    const service = await createService(
      prisma,
      { delete: deleteImage },
      { increment: jest.fn() },
    );

    await expect(
      service.deleteImage('image-id', 'owner-id'),
    ).resolves.toBeUndefined();
    expect(deleteImage).toHaveBeenCalledWith('image-key', 'LOCAL');
    await expect(
      service.deleteImage('image-id', 'other-owner'),
    ).rejects.toThrow('repository owner');
  });
});

async function createService(
  prisma: object,
  mediaStorage: object,
  redis: object,
) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      PromptEvidenceImageService,
      { provide: PrismaService, useValue: prisma },
      { provide: MediaStorageService, useValue: mediaStorage },
      { provide: RedisService, useValue: redis },
    ],
  }).compile();

  return moduleRef.get(PromptEvidenceImageService);
}
