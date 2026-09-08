import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { basename, extname, resolve } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaService } from './quota.service';
import type { ProviderFile } from './providers';
import type { Prisma } from '@prisma/client';

export const MAX_GENERATED_IMAGE_BYTES = 10_000_000;
export function storageAllowance(code?: string) {
  return (
    {
      STARTER: { bytes: 50_000_000, files: 100 },
      PRO: { bytes: 250_000_000, files: 500 },
      MAX: { bytes: 1_000_000_000, files: 2000 },
    }[code ?? ''] ?? { bytes: 0, files: 0 }
  );
}

export function validateFile(file: Express.Multer.File) {
  const extension = extname(file.originalname).toLowerCase();
  const data = file.buffer;
  const matches =
    (file.mimetype === 'application/pdf' &&
      extension === '.pdf' &&
      data.subarray(0, 5).toString() === '%PDF-') ||
    (file.mimetype === 'image/png' &&
      extension === '.png' &&
      data
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (file.mimetype === 'image/jpeg' &&
      ['.jpg', '.jpeg'].includes(extension) &&
      data[0] === 255 &&
      data[1] === 216 &&
      data[2] === 255) ||
    (file.mimetype === 'text/plain' &&
      ['.txt', '.md', '.csv'].includes(extension) &&
      !data.includes(0) &&
      Buffer.from(data.toString('utf8'), 'utf8').equals(data));
  if (!matches || !data.length)
    throw new BadRequestException(
      'Upload a valid PDF, PNG, JPEG or UTF-8 text file.',
    );
}

@Injectable()
export class AttachmentService {
  private readonly root = resolve(
    process.env.CHAT_STORAGE_DIR ?? './private-chat-files',
  );
  constructor(
    private readonly prisma: PrismaService,
    private readonly quota: QuotaService,
  ) {}
  private async checkStorage(
    db: Pick<Prisma.TransactionClient, 'attachment'>,
    userId: string,
    bytes: number,
    code?: string,
  ) {
    const limit = storageAllowance(code);
    const usage = await db.attachment.aggregate({
      where: { userId },
      _sum: { size: true },
      _count: { id: true },
    });
    if (
      (usage._sum.size ?? 0) + bytes > limit.bytes ||
      usage._count.id >= limit.files
    )
      throw new BadRequestException(
        'File storage allowance reached. Delete unused files or choose a larger plan.',
      );
  }
  async assertImageCapacity(userId: string) {
    const { plan, policies } = await this.quota.policies(userId);
    if (!policies.some((p) => p.allowedFeatures.includes('image_generation')))
      throw new BadRequestException(
        'Image generation is not included in your plan.',
      );
    await this.checkStorage(
      this.prisma,
      userId,
      MAX_GENERATED_IMAGE_BYTES,
      plan?.code,
    );
  }
  async owned(userId: string, id: string) {
    const file = await this.prisma.attachment.findFirst({
      where: { id, userId },
    });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }
  async assertDocumentCapacity(userId: string) {
    const { plan, policies } = await this.quota.policies(userId);
    if (!policies.some((p) => p.maxFiles > 0 && p.allowedFeatures.includes('chat')))
      throw new BadRequestException('Downloadable files require a paid plan with file access.');
    await this.checkStorage(this.prisma, userId, 100_000, plan?.code);
  }
  async saveDocument(userId: string, conversationId: string, content: string, format: 'txt' | 'md' | 'csv') {
    await this.assertDocumentCapacity(userId);
    const data = Buffer.from(content.replace(/^```[^\n]*\n([\s\S]*?)\n```\s*$/, '$1'), 'utf8');
    if (!data.length || data.length > 100_000)
      throw new BadRequestException('Generated document exceeds the 100 KB limit.');
    const { plan } = await this.quota.policies(userId);
    const key = randomUUID();
    await mkdir(this.root, { recursive: true });
    await writeFile(resolve(this.root, key), data, { flag: 'wx', mode: 0o600 });
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
        await this.checkStorage(tx, userId, data.length, plan?.code);
        if (!(await tx.conversation.findFirst({ where: { id: conversationId, userId } })))
          throw new NotFoundException('Conversation not found');
        return tx.attachment.create({ data: {
          id: key, storageKey: key, userId, conversationId, generated: true,
          name: `document.${format}`, mimeType: 'text/plain', size: data.length,
        }, select: { id: true, name: true, mimeType: true, size: true } });
      });
    } catch (error) { await unlink(resolve(this.root, key)); throw error; }
  }
  async saveGenerated(
    userId: string,
    conversationId: string,
    mimeType: string,
    base64: string,
  ) {
    if (base64.length > Math.ceil(MAX_GENERATED_IMAGE_BYTES / 3) * 4)
      throw new BadRequestException('Generated image exceeds storage limit');
    const extension =
      mimeType === 'image/png'
        ? '.png'
        : mimeType === 'image/jpeg'
          ? '.jpg'
          : '';
    if (!extension)
      throw new BadRequestException('Unsupported generated image format');
    const data = Buffer.from(base64, 'base64');
    if (data.length > MAX_GENERATED_IMAGE_BYTES)
      throw new BadRequestException('Generated image exceeds storage limit');
    validateFile({
      originalname: `image${extension}`,
      mimetype: mimeType,
      buffer: data,
    } as Express.Multer.File);
    const { plan, policies } = await this.quota.policies(userId);
    if (!policies.some((p) => p.allowedFeatures.includes('image_generation')))
      throw new BadRequestException(
        'Image generation is not included in your plan.',
      );
    const key = randomUUID();
    await mkdir(this.root, { recursive: true });
    await writeFile(resolve(this.root, key), data, { flag: 'wx', mode: 0o600 });
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
        await this.checkStorage(tx, userId, data.length, plan?.code);
        if (
          !(await tx.conversation.findFirst({
            where: { id: conversationId, userId },
          }))
        )
          throw new NotFoundException('Conversation not found');
        return tx.attachment.create({
          data: {
            id: key,
            storageKey: key,
            userId,
            conversationId,
            generated: true,
            name: `generated${extension}`,
            mimeType,
            size: data.length,
          },
          select: { id: true, name: true, mimeType: true, size: true },
        });
      });
    } catch (error) {
      await unlink(resolve(this.root, key));
      throw error;
    }
  }
  async upload(
    userId: string,
    conversationId: string,
    file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Choose a file');
    validateFile(file);
    const { plan, policies } = await this.quota.policies(userId);
    if (
      !policies.some(
        (p) => p.maxFiles > 0 && p.maxFileBytes >= file.buffer.length,
      )
    )
      throw new BadRequestException('File exceeds your plan allowance.');
    const key = randomUUID();
    await mkdir(this.root, { recursive: true });
    await writeFile(resolve(this.root, key), file.buffer, {
      flag: 'wx',
      mode: 0o600,
    });
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
        await this.checkStorage(tx, userId, file.buffer.length, plan?.code);
        await tx.$queryRaw`SELECT id FROM "Conversation" WHERE id = ${conversationId}::uuid FOR UPDATE`;
        if (
          !(await tx.conversation.findFirst({
            where: { id: conversationId, userId },
          }))
        )
          throw new NotFoundException('Conversation not found');
        return tx.attachment.create({
          data: {
            id: key,
            storageKey: key,
            userId,
            conversationId,
            name: basename(file.originalname).slice(0, 200),
            mimeType: file.mimetype,
            size: file.buffer.length,
          },
          select: { id: true, name: true, size: true, mimeType: true },
        });
      });
    } catch (error) {
      await unlink(resolve(this.root, key));
      throw error;
    }
  }
  async read(userId: string, id: string) {
    const file = await this.owned(userId, id);
    return { file, data: await readFile(resolve(this.root, file.storageKey)) };
  }
  async forConversation(
    userId: string,
    conversationId: string,
    selectedIds: string[] = [],
  ): Promise<ProviderFile[]> {
    const conversation = selectedIds.length
      ? await this.prisma.conversation.findFirst({
          where: { id: conversationId, userId },
          select: { projectId: true },
        })
      : null;
    const files = await this.prisma.attachment.findMany({
      where: {
        userId,
        ...(conversation?.projectId
          ? { conversation: { projectId: conversation.projectId } }
          : { conversationId }),
        generated: false,
        ...(selectedIds ? { id: { in: selectedIds } } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
    if (selectedIds && files.length !== new Set(selectedIds).size)
      throw new BadRequestException(
        'One or more selected files are unavailable.',
      );
    return Promise.all(
      files.map(async (file) => ({
        name: file.name,
        mimeType: file.mimeType,
        data: await readFile(resolve(this.root, file.storageKey)),
      })),
    );
  }
  async remove(userId: string, id: string) {
    const file = await this.owned(userId, id);
    await this.prisma.attachment.delete({ where: { id: file.id } });
    await unlink(resolve(this.root, file.storageKey)).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error;
      },
    );
    return { deleted: true };
  }
}
