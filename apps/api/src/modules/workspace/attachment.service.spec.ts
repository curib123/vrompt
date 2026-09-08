import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  AttachmentService,
  MAX_GENERATED_IMAGE_BYTES,
  storageAllowance,
} from './attachment.service';

describe('attachment allowances', () => {
  let root: string;
  let previousRoot: string | undefined;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'vrompt-attachment-test-'));
    previousRoot = process.env.CHAT_STORAGE_DIR;
    process.env.CHAT_STORAGE_DIR = root;
  });
  afterEach(async () => {
    if (previousRoot === undefined) delete process.env.CHAT_STORAGE_DIR;
    else process.env.CHAT_STORAGE_DIR = previousRoot;
    await rm(root, { recursive: true, force: true });
  });
  function setup(code = 'STARTER', bytes = 0, count = 0) {
    const prisma: any = {
      $queryRaw: jest.fn(),
      conversation: {
        findFirst: jest.fn().mockResolvedValue({ id: 'conversation' }),
      },
      attachment: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { size: bytes }, _count: { id: count } }),
        create: jest.fn(async ({ data }) => data),
      },
    };
    prisma.$transaction = (fn: any) => fn(prisma);
    const service = new AttachmentService(prisma, {
      policies: async () => ({
        plan: { code },
        policies: [
          {
            maxFiles: code === 'FREE' ? 0 : 1,
            maxFileBytes: 5_000_000,
            allowedFeatures:
              code === 'PRO' || code === 'MAX'
                ? ['chat', 'image_generation']
                : ['chat'],
          },
        ],
      }),
    } as any);
    const file = {
      originalname: 'notes.txt',
      mimetype: 'text/plain',
      buffer: Buffer.from('hello'),
      size: 5,
    } as Express.Multer.File;
    return { service, prisma, file };
  }
  it('allows more stored files than the per-message selection limit', async () => {
    const s = setup('STARTER', 100, 2);
    await expect(
      s.service.upload('user', 'conversation', s.file),
    ).resolves.toMatchObject({ size: 5 });
  });
  it.each(['FREE', 'STARTER', 'PRO', 'MAX'])(
    'enforces the %s account storage budget and cleans rejected writes',
    async (code) => {
      const s = setup(code, storageAllowance(code).bytes);
      await expect(
        s.service.upload('user', 'conversation', s.file),
      ).rejects.toThrow();
      expect(s.prisma.attachment.create).not.toHaveBeenCalled();
      expect(await readdir(root)).toEqual([]);
    },
  );
  it('checks actual bytes rather than a supplied size and rejects oversized uploads', async () => {
    const s = setup();
    s.file.buffer = Buffer.alloc(5_000_001, 'a');
    await expect(
      s.service.upload('user', 'conversation', s.file),
    ).rejects.toThrow('plan allowance');
  });
  it('bounds file count even for tiny uploads', async () => {
    const s = setup('STARTER', 0, 100);
    await expect(
      s.service.upload('user', 'conversation', s.file),
    ).rejects.toThrow('storage allowance');
  });
  it('rejects image generation before provider work when capacity or plan access is missing', async () => {
    await expect(
      setup('STARTER').service.assertImageCapacity('user'),
    ).rejects.toThrow('not included');
    await expect(
      setup(
        'PRO',
        250_000_000 - MAX_GENERATED_IMAGE_BYTES + 1,
      ).service.assertImageCapacity('user'),
    ).rejects.toThrow('storage allowance');
    await expect(
      setup('PRO').service.assertImageCapacity('user'),
    ).resolves.toBeUndefined();
  });
});
