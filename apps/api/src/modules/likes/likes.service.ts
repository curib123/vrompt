import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  PromptRepositoryStatus,
  PromptVisibility,
} from '@prisma/client';

import { slugify } from '../common/slug';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LikesService {
  constructor(private readonly prismaService: PrismaService) {}

  async like(userId: string, slug: string) {
    const repository = await this.findReadableRepository(userId, slug);

    try {
      await this.prismaService.$transaction(async (transaction) => {
        await transaction.like.create({
          data: { userId, promptRepositoryId: repository.id },
        });
        await transaction.promptRepository.update({
          where: { id: repository.id },
          data: { likeCount: { increment: 1 } },
        });
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { liked: true, likeCount: repository.likeCount };
      }

      throw error;
    }

    return { liked: true, likeCount: repository.likeCount + 1 };
  }

  async unlike(userId: string, slug: string) {
    const repository = await this.findReadableRepository(userId, slug);
    const deletedCount = await this.prismaService.$transaction(
      async (transaction) => {
        const deleted = await transaction.like.deleteMany({
          where: { userId, promptRepositoryId: repository.id },
        });

        if (deleted.count > 0) {
          await transaction.promptRepository.update({
            where: { id: repository.id },
            data: { likeCount: { decrement: 1 } },
          });
        }

        return deleted.count;
      },
    );

    return {
      liked: false,
      likeCount: Math.max(repository.likeCount - (deletedCount > 0 ? 1 : 0), 0),
    };
  }

  private async findReadableRepository(userId: string, slug: string) {
    const repository = await this.prismaService.promptRepository.findUnique({
      where: { slug: slugify(slug) },
      select: {
        id: true,
        ownerId: true,
        visibility: true,
        status: true,
        likeCount: true,
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
