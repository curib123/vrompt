import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  PromptRepositoryStatus,
  PromptVisibility,
} from '@prisma/client';

import { slugify } from '../common/slug';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookmarksService {
  constructor(private readonly prismaService: PrismaService) {}

  async save(userId: string, slug: string) {
    const repository = await this.findReadableRepository(userId, slug);

    try {
      await this.prismaService.$transaction(async (transaction) => {
        await transaction.bookmark.create({
          data: { userId, promptRepositoryId: repository.id },
        });
        await transaction.promptRepository.update({
          where: { id: repository.id },
          data: { saveCount: { increment: 1 } },
        });
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { saved: true, saveCount: repository.saveCount };
      }

      throw error;
    }

    return {
      saved: true,
      saveCount: repository.saveCount + 1,
      isFavorite: false,
      isPinned: false,
    };
  }

  async remove(userId: string, slug: string) {
    const repository = await this.findReadableRepository(userId, slug);
    const deletedCount = await this.prismaService.$transaction(
      async (transaction) => {
        const deleted = await transaction.bookmark.deleteMany({
          where: { userId, promptRepositoryId: repository.id },
        });

        if (deleted.count > 0) {
          await transaction.promptRepository.update({
            where: { id: repository.id },
            data: { saveCount: { decrement: 1 } },
          });
        }

        return deleted.count;
      },
    );

    return {
      saved: false,
      saveCount: Math.max(repository.saveCount - (deletedCount > 0 ? 1 : 0), 0),
    };
  }

  async list(
    userId: string,
    page = 1,
    pageSize = 12,
    sort: 'newest' | 'updated' = 'newest',
  ) {
    const safePage = Math.max(page, 1);
    const safePageSize = Math.min(Math.max(pageSize, 1), 30);
    const where = {
      userId,
      promptRepository: { status: PromptRepositoryStatus.ACTIVE },
    };
    const [items, total] = await Promise.all([
      this.prismaService.bookmark.findMany({
        where,
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        orderBy:
          sort === 'updated'
            ? { promptRepository: { updatedAt: 'desc' } }
            : { createdAt: 'desc' },
        select: {
          createdAt: true,
          lastUsedAt: true,
          useCount: true,
          isFavorite: true,
          isPinned: true,
          promptRepository: {
            select: {
              id: true,
              title: true,
              slug: true,
              description: true,
              visibility: true,
              updatedAt: true,
              owner: { select: { username: true } },
              category: { select: { name: true, slug: true } },
              promptAudiences: {
                select: {
                  audience: { select: { id: true, name: true, slug: true } },
                },
                orderBy: { audience: { sortOrder: 'asc' } },
              },
            },
          },
        },
      }),
      this.prismaService.bookmark.count({ where }),
    ]);

    return {
      items,
      page: safePage,
      pageSize: safePageSize,
      total,
      hasNextPage: safePage * safePageSize < total,
    };
  }

  async use(userId: string, slug: string) {
    const repository = await this.findReadableRepository(userId, slug);
    const bookmark = await this.prismaService.bookmark.updateMany({
      where: { userId, promptRepositoryId: repository.id },
      data: { useCount: { increment: 1 }, lastUsedAt: new Date() },
    });
    if (bookmark.count !== 1) {
      throw new NotFoundException('Save this prompt before using it again.');
    }
    return {
      used: true,
      useCount:
        (
          await this.prismaService.bookmark.findUnique({
            where: {
              userId_promptRepositoryId: {
                userId,
                promptRepositoryId: repository.id,
              },
            },
            select: { useCount: true, lastUsedAt: true },
          })
        )?.useCount ?? 1,
    };
  }

  async setFavorite(userId: string, slug: string, favorite: boolean) {
    const repository = await this.findReadableRepository(userId, slug);
    const result = await this.prismaService.bookmark.updateMany({
      where: { userId, promptRepositoryId: repository.id },
      data: { isFavorite: favorite },
    });
    if (result.count !== 1)
      throw new NotFoundException('Save this prompt first.');
    return { favorite };
  }

  async setPinned(userId: string, slug: string, pinned: boolean) {
    const repository = await this.findReadableRepository(userId, slug);
    const result = await this.prismaService.bookmark.updateMany({
      where: { userId, promptRepositoryId: repository.id },
      data: { isPinned: pinned },
    });
    if (result.count !== 1)
      throw new NotFoundException('Save this prompt first.');
    return { pinned };
  }

  private async findReadableRepository(userId: string, slug: string) {
    const repository = await this.prismaService.promptRepository.findUnique({
      where: { slug: slugify(slug) },
      select: {
        id: true,
        ownerId: true,
        visibility: true,
        status: true,
        saveCount: true,
      },
    });

    if (
      !repository ||
      repository.status !== PromptRepositoryStatus.ACTIVE ||
      (repository.visibility === PromptVisibility.PRIVATE &&
        repository.ownerId !== userId)
    ) {
      throw new NotFoundException('Repository not found');
    }

    return repository;
  }
}
