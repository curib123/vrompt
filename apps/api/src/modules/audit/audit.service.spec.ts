import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('clamps pagination and applies administrative filters', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = { auditLog: { findMany, count } };

    await expect(
      new AuditService(prisma as unknown as PrismaService).list({
        action: 'REPORT_RESOLVED',
        actor: ' Moderator ',
        page: 0,
        pageSize: 1000,
        targetType: 'REPORT',
      }),
    ).resolves.toMatchObject({ page: 1, pageSize: 100, hasNextPage: false });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          action: 'REPORT_RESOLVED',
          targetType: 'REPORT',
          actor: { username: 'moderator' },
        }),
        take: 100,
      }),
    );
  });
});
