import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('SettingsService validation and public boundary', () => {
  const prisma = {
    siteSetting: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  };
  const service = new SettingsService(prisma as unknown as PrismaService);
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.siteSetting.findMany.mockResolvedValue([]);
    prisma.siteSetting.upsert.mockImplementation(async ({ create }) => create);
  });
  it('never exposes private or unrecognized settings even if stored as public', async () => {
    prisma.siteSetting.findMany.mockResolvedValue([
      { key: 'billing.proPriceCentavos', value: 500 },
      { key: 'unexpected.secret', value: 'secret' },
      { key: 'branding.siteName', value: 'My workspace' },
    ]);
    const result = await service.publicSettings();
    expect(result['branding.siteName']).toBe('My workspace');
    expect(result).not.toHaveProperty('billing.proPriceCentavos');
    expect(result).not.toHaveProperty('unexpected.secret');
  });
  it.each(['__proto__', 'constructor', 'toString', 'unknown'])(
    'rejects unrecognized key %s without writes',
    async (key) => {
      await expect(
        service.update('admin', key, 'value'),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.reset('admin', key)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.siteSetting.upsert).not.toHaveBeenCalled();
      expect(prisma.siteSetting.deleteMany).not.toHaveBeenCalled();
    },
  );
  it.each([0, -1, 1.5, Infinity, NaN, '10', 10000001])(
    'rejects invalid billing amount %s',
    async (value) => {
      await expect(
        service.update('admin', 'billing.proPriceCentavos', value),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.siteSetting.upsert).not.toHaveBeenCalled();
    },
  );
  it('rejects long branding values instead of silently truncating', async () => {
    await expect(
      service.update('admin', 'branding.siteName', 'x'.repeat(41)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('persists normalized values with the actor and records the change', async () => {
    await service.update('admin', 'branding.siteName', '  New name  ');
    expect(prisma.siteSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          value: 'New name',
          updatedById: 'admin',
        }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: 'admin',
          action: 'SETTING_UPDATED',
        }),
      }),
    );
  });
});
