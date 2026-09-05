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
  async owned(userId: string, id: string) {
    const file = await this.prisma.attachment.findFirst({
      where: { id, userId },
    });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }
  async saveGenerated(
    userId: string,
    conversationId: string,
    mimeType: string,
    base64: string,
  ) {
    if (base64.length > 28_000_000)
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
    validateFile({
      originalname: `image${extension}`,
      mimetype: mimeType,
      buffer: data,
    } as Express.Multer.File);
    const key = randomUUID();
    await mkdir(this.root, { recursive: true });
    await writeFile(resolve(this.root, key), data, { flag: 'wx', mode: 0o600 });
    try {
      return await this.prisma.attachment.create({
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
    const { policies } = await this.quota.policies(userId);
    if (!policies.some((p) => p.maxFiles > 0 && p.maxFileBytes >= file.size))
      throw new BadRequestException('File exceeds your plan allowance.');
    const key = randomUUID();
    await mkdir(this.root, { recursive: true });
    await writeFile(resolve(this.root, key), file.buffer, {
      flag: 'wx',
      mode: 0o600,
    });
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Conversation" WHERE id = ${conversationId}::uuid FOR UPDATE`;
        if (
          !(await tx.conversation.findFirst({
            where: { id: conversationId, userId },
          }))
        )
          throw new NotFoundException('Conversation not found');
        const count = await tx.attachment.count({
          where: { conversationId, generated: false },
        });
        if (count >= Math.max(...policies.map((p) => p.maxFiles)))
          throw new BadRequestException('Conversation file allowance reached.');
        return tx.attachment.create({
          data: {
            id: key,
            storageKey: key,
            userId,
            conversationId,
            name: basename(file.originalname).slice(0, 200),
            mimeType: file.mimetype,
            size: file.size,
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
    selectedIds?: string[],
  ): Promise<ProviderFile[]> {
    const files = await this.prisma.attachment.findMany({
      where: {
        userId,
        conversationId,
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
