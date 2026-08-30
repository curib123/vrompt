import { PrismaService } from '../prisma/prisma.service';
import { ModerationService } from './moderation.service';

describe('ModerationService', () => {
  it('hides a repository and records an audit event', async () => {
    const auditLog = { create: jest.fn().mockResolvedValue(undefined) };
    const prisma = {
      promptRepository: {
        update: jest
          .fn()
          .mockResolvedValue({ id: 'repo-id', status: 'HIDDEN' }),
      },
      auditLog,
    };
    const service = new ModerationService(prisma as unknown as PrismaService);

    await expect(
      service.repository('moderator-id', 'repo-id', { action: 'HIDE' }),
    ).resolves.toEqual({ id: 'repo-id', status: 'HIDDEN' });
    expect(auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'PROMPT_HIDDEN',
          targetId: 'repo-id',
        }),
      }),
    );
  });

  it('records evidence moderation without deleting the image', async () => {
    const update = jest
      .fn()
      .mockResolvedValue({ id: 'image-id', isHidden: true });
    const prisma = {
      promptEvidenceImage: { update },
      auditLog: { create: jest.fn().mockResolvedValue(undefined) },
    };
    const service = new ModerationService(prisma as unknown as PrismaService);

    await expect(
      service.evidence('moderator-id', 'image-id', { action: 'HIDE' }),
    ).resolves.toEqual({ id: 'image-id', isHidden: true });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isHidden: true } }),
    );
  });
});
