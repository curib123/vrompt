import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  PromptRepositoryStatus,
  PromptVisibility,
  UserStatus,
} from '@prisma/client';

import { slugify } from '../common/slug';
import { PrismaService } from '../prisma/prisma.service';
import type { AddCollectionItemDto } from './dto/add-collection-item.dto';
import type { CreateCollectionDto } from './dto/create-collection.dto';
import type { ReorderCollectionDto } from './dto/reorder-collection.dto';
import type { UpdateCollectionDto } from './dto/update-collection.dto';

@Injectable()
export class CollectionsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(ownerId: string, input: CreateCollectionDto) {
    const name = input.name.trim();
    const slug = slugify(name);
    if (!slug) {
      throw new ConflictException(
        'Collection name must include a letter or number',
      );
    }

    try {
      return await this.prismaService.collection.create({
        data: {
          ownerId,
          name,
          slug,
          description: this.cleanNullable(input.description),
          visibility: input.visibility ?? 'PRIVATE',
        },
        select: this.collectionSelect,
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'You already have a collection with that name',
        );
      }
      throw error;
    }
  }

  async listMine(ownerId: string) {
    return this.prismaService.collection.findMany({
      where: { ownerId, archivedAt: null },
      orderBy: { updatedAt: 'desc' },
      select: this.collectionSelect,
    });
  }

  async get(username: string, slug: string, viewerId?: string) {
    const collection = await this.prismaService.collection.findFirst({
      where: {
        slug,
        archivedAt: null,
        owner: {
          username: username.trim().toLowerCase(),
          status: UserStatus.ACTIVE,
        },
      },
      select: this.collectionSelect,
    });

    if (
      !collection ||
      (collection.visibility === 'PRIVATE' && collection.owner.id !== viewerId)
    ) {
      throw new NotFoundException('Collection not found');
    }
    return collection;
  }

  async update(
    collectionId: string,
    ownerId: string,
    input: UpdateCollectionDto,
  ) {
    await this.assertOwner(collectionId, ownerId);
    const data = {
      ...(input.name !== undefined
        ? { name: input.name.trim(), slug: slugify(input.name) }
        : {}),
      ...(input.description !== undefined
        ? { description: this.cleanNullable(input.description) }
        : {}),
      ...(input.visibility !== undefined
        ? { visibility: input.visibility }
        : {}),
    };
    try {
      return await this.prismaService.collection.update({
        where: { id: collectionId },
        data,
        select: this.collectionSelect,
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'You already have a collection with that name',
        );
      }
      throw error;
    }
  }

  async archive(collectionId: string, ownerId: string) {
    await this.assertOwner(collectionId, ownerId);
    await this.prismaService.collection.update({
      where: { id: collectionId },
      data: { archivedAt: new Date() },
    });
    return { archived: true };
  }

  async addItem(
    collectionId: string,
    ownerId: string,
    input: AddCollectionItemDto,
  ) {
    await this.assertOwner(collectionId, ownerId);
    const repository = await this.prismaService.promptRepository.findFirst({
      where: {
        id: input.promptRepositoryId,
        status: PromptRepositoryStatus.ACTIVE,
        OR: [
          {
            visibility: {
              in: [PromptVisibility.PUBLIC, PromptVisibility.UNLISTED],
            },
          },
          { ownerId },
        ],
      },
      select: { id: true },
    });
    if (!repository) {
      throw new NotFoundException('Prompt repository not found');
    }

    const existing = await this.prismaService.collectionPrompt.findUnique({
      where: {
        collectionId_promptRepositoryId: {
          collectionId,
          promptRepositoryId: repository.id,
        },
      },
      select: { promptRepositoryId: true },
    });
    if (existing) {
      return this.getById(collectionId, ownerId);
    }

    const max = await this.prismaService.collectionPrompt.aggregate({
      where: { collectionId },
      _max: { sortOrder: true },
    });
    await this.prismaService.collectionPrompt.create({
      data: {
        collectionId,
        promptRepositoryId: repository.id,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
    });
    return this.getById(collectionId, ownerId);
  }

  async removeItem(
    collectionId: string,
    ownerId: string,
    promptRepositoryId: string,
  ) {
    await this.assertOwner(collectionId, ownerId);
    await this.prismaService.collectionPrompt.deleteMany({
      where: { collectionId, promptRepositoryId },
    });
    return this.getById(collectionId, ownerId);
  }

  async reorder(
    collectionId: string,
    ownerId: string,
    input: ReorderCollectionDto,
  ) {
    await this.assertOwner(collectionId, ownerId);
    const uniqueIds = [...new Set(input.promptRepositoryIds)];
    const current = await this.prismaService.collectionPrompt.findMany({
      where: { collectionId },
      select: { promptRepositoryId: true },
    });
    if (
      uniqueIds.length !== current.length ||
      uniqueIds.some(
        (id) => !current.some((item) => item.promptRepositoryId === id),
      )
    ) {
      throw new ConflictException(
        'Reorder must include every collection item exactly once',
      );
    }

    await this.prismaService.$transaction(async (transaction) => {
      await transaction.collectionPrompt.updateMany({
        where: { collectionId },
        data: { sortOrder: { increment: 1000 } },
      });
      for (const [sortOrder, promptRepositoryId] of uniqueIds.entries()) {
        await transaction.collectionPrompt.update({
          where: {
            collectionId_promptRepositoryId: {
              collectionId,
              promptRepositoryId,
            },
          },
          data: { sortOrder },
        });
      }
    });
    return this.getById(collectionId, ownerId);
  }

  private async getById(collectionId: string, ownerId: string) {
    const collection = await this.prismaService.collection.findFirst({
      where: { id: collectionId, ownerId, archivedAt: null },
      select: this.collectionSelect,
    });
    if (!collection) {
      throw new NotFoundException('Collection not found');
    }
    return collection;
  }

  private async assertOwner(collectionId: string, ownerId: string) {
    const collection = await this.prismaService.collection.findFirst({
      where: { id: collectionId, ownerId, archivedAt: null },
      select: { id: true },
    });
    if (!collection) {
      throw new ForbiddenException('Only the collection owner can manage it');
    }
  }

  private cleanNullable(value: string | null | undefined) {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed || null;
  }

  private readonly collectionSelect = {
    id: true,
    name: true,
    slug: true,
    description: true,
    visibility: true,
    createdAt: true,
    updatedAt: true,
    owner: { select: { id: true, username: true } },
    items: {
      orderBy: { sortOrder: 'asc' },
      select: {
        promptRepositoryId: true,
        sortOrder: true,
        promptRepository: {
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            visibility: true,
            owner: { select: { username: true } },
          },
        },
      },
    },
  } as const;
}
