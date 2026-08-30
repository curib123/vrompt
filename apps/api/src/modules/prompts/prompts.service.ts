import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  PromptRepositoryStatus,
  PromptVersionStatus,
  PromptVisibility,
} from '@prisma/client';
import { createHash } from 'node:crypto';

import { slugify } from '../common/slug';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePromptRepositoryDto } from './dto/create-prompt-repository.dto';
import type { CopyPromptDto } from './dto/copy-prompt.dto';
import type { CreatePromptVersionDto } from './dto/create-prompt-version.dto';
import type { CreateVariantDto } from './dto/create-variant.dto';
import { TagsService } from '../tags/tags.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PromptsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tagsService: TagsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(ownerId: string, input: CreatePromptRepositoryDto) {
    const category = input.categorySlug
      ? await this.prismaService.category.findUnique({
          where: { slug: slugify(input.categorySlug) },
          select: { id: true },
        })
      : null;

    if (input.categorySlug && !category) {
      throw new BadRequestException('Category not found');
    }

    const tagNames = this.uniqueTagNames(input.tags ?? []);
    const tags = await Promise.all(
      tagNames.map((name) => this.tagsService.createOrGet({ name })),
    );
    const visibility = input.visibility ?? PromptVisibility.PRIVATE;
    const versionStatus =
      visibility === PromptVisibility.PRIVATE
        ? PromptVersionStatus.DRAFT
        : PromptVersionStatus.PUBLISHED;

    try {
      return await this.prismaService.$transaction(async (transaction) => {
        const slug = await this.uniqueSlug(
          transaction,
          slugify(input.slug || input.title),
        );
        const repository = await transaction.promptRepository.create({
          data: {
            ownerId,
            categoryId: category?.id,
            title: input.title.trim(),
            slug,
            description: this.cleanNullable(input.description),
            aiCompatibility: this.cleanNullable(input.aiCompatibility),
            visibility,
            status: PromptRepositoryStatus.ACTIVE,
            license: this.cleanNullable(input.license),
            versions: {
              create: {
                authorId: ownerId,
                content: input.content,
                changelog: this.cleanNullable(input.changelog),
                status: versionStatus,
                publishedAt:
                  versionStatus === PromptVersionStatus.PUBLISHED
                    ? new Date()
                    : undefined,
                variables: {
                  create: (input.variables ?? []).map((variable, index) => ({
                    name: variable.name.trim(),
                    description: this.cleanNullable(variable.description),
                    defaultValue: this.cleanNullable(variable.defaultValue),
                    required: variable.required ?? false,
                    sortOrder: index,
                  })),
                },
                examples: {
                  create: (input.examples ?? []).map((example, index) => ({
                    title: this.cleanNullable(example.title),
                    input: example.input,
                    output: example.output,
                    sortOrder: index,
                  })),
                },
              },
            },
          },
          select: { id: true, slug: true, versions: { select: { id: true } } },
        });
        const version = repository.versions[0];

        if (!version) {
          throw new BadRequestException('Version 1 could not be created');
        }

        await transaction.promptRepository.update({
          where: { id: repository.id },
          data: { currentVersionId: version.id },
        });

        if (tags.length > 0) {
          await transaction.promptTag.createMany({
            data: tags.map((tag) => ({
              promptRepositoryId: repository.id,
              tagId: tag.id,
            })),
            skipDuplicates: true,
          });
        }

        await transaction.activityEvent.create({
          data: {
            actorId: ownerId,
            promptRepositoryId: repository.id,
            type: 'REPOSITORY_CREATED',
            metadata: { title: repository.slug },
          },
        });

        return {
          id: repository.id,
          slug: repository.slug,
          promptVersionId: version.id,
        };
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A repository with that slug already exists',
        );
      }

      throw error;
    }
  }

  async getBySlug(slug: string, viewerId?: string) {
    const repository = await this.prismaService.promptRepository.findUnique({
      where: { slug: slugify(slug) },
      select: this.repositorySelect,
    });

    if (!repository || repository.status !== PromptRepositoryStatus.ACTIVE) {
      throw new NotFoundException('Repository not found');
    }

    if (
      repository.visibility === PromptVisibility.PRIVATE &&
      repository.ownerId !== viewerId
    ) {
      throw new NotFoundException('Repository not found');
    }

    if (!viewerId) {
      return { ...repository, isSaved: false, isLiked: false };
    }

    const bookmark = await this.prismaService.bookmark.findUnique({
      where: {
        userId_promptRepositoryId: {
          userId: viewerId,
          promptRepositoryId: repository.id,
        },
      },
      select: { userId: true },
    });
    const like = await this.prismaService.like.findUnique({
      where: {
        userId_promptRepositoryId: {
          userId: viewerId,
          promptRepositoryId: repository.id,
        },
      },
      select: { userId: true },
    });

    return {
      ...repository,
      isSaved: Boolean(bookmark),
      isLiked: Boolean(like),
    };
  }

  async copyBySlug(
    slug: string,
    viewerId: string | undefined,
    input: CopyPromptDto,
  ) {
    const repository = await this.getBySlug(slug, viewerId);
    const version = repository.currentVersion;

    if (!version) {
      throw new NotFoundException('Prompt version not found');
    }

    const identity = viewerId
      ? `user:${viewerId}`
      : `client:${input.clientKey ?? 'anonymous'}`;
    const bucket = Math.floor(Date.now() / (60 * 60 * 1000));
    const dedupeKey = createHash('sha256')
      .update(`${repository.id}:${version.id}:${identity}:${bucket}`)
      .digest('hex');
    let counted = true;

    try {
      await this.prismaService.$transaction(async (transaction) => {
        await transaction.promptCopyEvent.create({
          data: {
            dedupeKey,
            promptRepositoryId: repository.id,
            promptVersionId: version.id,
            userId: viewerId,
          },
        });
        await transaction.promptRepository.update({
          where: { id: repository.id },
          data: { copyCount: { increment: 1 } },
        });
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        counted = false;
      } else {
        throw error;
      }
    }

    const current = await this.prismaService.promptRepository.findUnique({
      where: { id: repository.id },
      select: { copyCount: true },
    });

    return {
      content: version.content,
      copyCount: current?.copyCount ?? 0,
      counted,
    };
  }

  async listVersions(slug: string, viewerId?: string) {
    const repository = await this.prismaService.promptRepository.findUnique({
      where: { slug: slugify(slug) },
      select: { id: true, ownerId: true, visibility: true, status: true },
    });

    this.assertReadableRepository(repository, viewerId);

    return this.prismaService.promptVersion.findMany({
      where: { repositoryId: repository.id },
      orderBy: { versionNumber: 'desc' },
      select: {
        id: true,
        versionNumber: true,
        changelog: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { username: true } },
      },
    });
  }

  async getVersion(slug: string, versionNumber: number, viewerId?: string) {
    const repository = await this.prismaService.promptRepository.findUnique({
      where: { slug: slugify(slug) },
      select: { id: true, ownerId: true, visibility: true, status: true },
    });

    this.assertReadableRepository(repository, viewerId);

    const version = await this.prismaService.promptVersion.findFirst({
      where: { repositoryId: repository.id, versionNumber },
      select: this.versionSelect,
    });

    if (!version) {
      throw new NotFoundException('Prompt version not found');
    }

    return version;
  }

  async createVersion(
    slug: string,
    actorId: string,
    input: CreatePromptVersionDto,
  ) {
    const repository = await this.prismaService.promptRepository.findUnique({
      where: { slug: slugify(slug) },
      select: { id: true, ownerId: true, visibility: true, status: true },
    });

    if (!repository || repository.status !== PromptRepositoryStatus.ACTIVE) {
      throw new NotFoundException('Repository not found');
    }

    if (repository.ownerId !== actorId) {
      throw new ForbiddenException(
        'Only the repository owner can create a version',
      );
    }

    const versionStatus =
      input.publish || repository.visibility !== PromptVisibility.PRIVATE
        ? PromptVersionStatus.PUBLISHED
        : PromptVersionStatus.DRAFT;

    try {
      return await this.prismaService.$transaction(
        async (transaction) => {
          const latest = await transaction.promptVersion.aggregate({
            where: { repositoryId: repository.id },
            _max: { versionNumber: true },
          });
          const version = await transaction.promptVersion.create({
            data: {
              repositoryId: repository.id,
              authorId: actorId,
              versionNumber: (latest._max.versionNumber ?? 0) + 1,
              content: input.content,
              changelog: this.cleanNullable(input.changelog),
              status: versionStatus,
              publishedAt:
                versionStatus === PromptVersionStatus.PUBLISHED
                  ? new Date()
                  : undefined,
              variables: {
                create: (input.variables ?? []).map((variable, index) => ({
                  name: variable.name.trim(),
                  description: this.cleanNullable(variable.description),
                  defaultValue: this.cleanNullable(variable.defaultValue),
                  required: variable.required ?? false,
                  sortOrder: index,
                })),
              },
              examples: {
                create: (input.examples ?? []).map((example, index) => ({
                  title: this.cleanNullable(example.title),
                  input: example.input,
                  output: example.output,
                  sortOrder: index,
                })),
              },
            },
            select: { id: true, versionNumber: true },
          });

          await transaction.promptRepository.update({
            where: { id: repository.id },
            data: { currentVersionId: version.id },
          });

          if (versionStatus === PromptVersionStatus.PUBLISHED) {
            await transaction.activityEvent.create({
              data: {
                actorId,
                promptRepositoryId: repository.id,
                type: 'VERSION_PUBLISHED',
                metadata: { versionNumber: version.versionNumber },
              },
            });
          }

          return version;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A version is already being created; try again',
        );
      }

      throw error;
    }
  }

  async createVariant(
    sourceSlug: string,
    actorId: string,
    input: CreateVariantDto,
  ) {
    const source = await this.getBySlug(sourceSlug, actorId);
    const created = await this.create(actorId, input);
    const rootPromptId = source.rootPromptId ?? source.id;

    await this.prismaService.$transaction(async (transaction) => {
      await transaction.promptRepository.update({
        where: { id: created.id },
        data: { sourcePromptId: source.id, rootPromptId },
      });
      await transaction.activityEvent.create({
        data: {
          actorId,
          promptRepositoryId: created.id,
          type: 'VARIANT_CREATED',
          metadata: { sourcePromptId: source.id },
        },
      });
      await transaction.promptRepository.update({
        where: { id: source.id },
        data: { variantCount: { increment: 1 } },
      });
    });

    await this.notificationsService.create({
      recipientId: source.ownerId,
      actorId,
      type: 'VARIANT_CREATED',
      promptRepositoryId: source.id,
    });

    return { ...created, sourcePromptId: source.id, rootPromptId };
  }

  async getLineage(slug: string, viewerId?: string) {
    const repository = await this.prismaService.promptRepository.findUnique({
      where: { slug: slugify(slug) },
      select: {
        id: true,
        ownerId: true,
        rootPromptId: true,
        sourcePromptId: true,
        visibility: true,
        status: true,
      },
    });

    this.assertReadableRepository(repository, viewerId);
    const rootId = repository.rootPromptId ?? repository.id;
    const repositories = await this.prismaService.promptRepository.findMany({
      where: {
        status: PromptRepositoryStatus.ACTIVE,
        OR: [{ id: rootId }, { rootPromptId: rootId }],
        AND: {
          ...(viewerId
            ? {
                OR: [
                  { visibility: { not: PromptVisibility.PRIVATE } },
                  { ownerId: viewerId },
                ],
              }
            : { visibility: { not: PromptVisibility.PRIVATE } }),
        },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        ownerId: true,
        title: true,
        slug: true,
        sourcePromptId: true,
        rootPromptId: true,
        variantCount: true,
        visibility: true,
        owner: { select: { username: true } },
      },
    });
    const byId = new Map(repositories.map((item) => [item.id, item]));
    const children = new Map<string, typeof repositories>();

    for (const item of repositories) {
      if (
        item.sourcePromptId &&
        item.sourcePromptId !== item.id &&
        byId.has(item.sourcePromptId)
      ) {
        const siblings = children.get(item.sourcePromptId) ?? [];
        siblings.push(item);
        children.set(item.sourcePromptId, siblings);
      }
    }

    const buildTree = (
      id: string,
      visited = new Set<string>(),
    ): LineageNode | null => {
      const item = byId.get(id);
      if (!item || visited.has(id)) {
        return null;
      }

      const nextVisited = new Set(visited).add(id);
      return {
        id: item.id,
        title: item.title,
        slug: item.slug,
        ownerUsername: item.owner.username,
        variantCount: item.variantCount,
        children: (children.get(id) ?? [])
          .map((child) => buildTree(child.id, nextVisited))
          .filter((child): child is LineageNode => child !== null),
      };
    };

    const root = buildTree(rootId);
    const current = byId.get(repository.id);
    const directSource = repository.sourcePromptId
      ? byId.get(repository.sourcePromptId)
      : undefined;

    return {
      root,
      currentRepositoryId: repository.id,
      directSource: directSource
        ? {
            id: directSource.id,
            title: directSource.title,
            slug: directSource.slug,
            ownerUsername: directSource.owner.username,
          }
        : null,
      variantCount: current?.variantCount ?? 0,
    };
  }

  private assertReadableRepository(
    repository: {
      id: string;
      ownerId: string;
      visibility: PromptVisibility;
      status: PromptRepositoryStatus;
    } | null,
    viewerId?: string,
  ): asserts repository is {
    id: string;
    ownerId: string;
    visibility: PromptVisibility;
    status: PromptRepositoryStatus;
  } {
    if (
      !repository ||
      repository.status !== PromptRepositoryStatus.ACTIVE ||
      (repository.visibility === PromptVisibility.PRIVATE &&
        repository.ownerId !== viewerId)
    ) {
      throw new NotFoundException('Repository not found');
    }
  }

  private async uniqueSlug(
    transaction: Prisma.TransactionClient,
    baseSlug: string,
  ) {
    const safeBase = baseSlug || 'prompt';

    for (let suffix = 0; suffix < 1000; suffix += 1) {
      const candidate = suffix === 0 ? safeBase : `${safeBase}-${suffix + 1}`;
      const existing = await transaction.promptRepository.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }
    }

    throw new ConflictException('Could not allocate a unique repository slug');
  }

  private uniqueTagNames(names: string[]) {
    const normalized = names.map((name) =>
      name.trim().replace(/\s+/g, ' ').toLowerCase(),
    );
    return [...new Set(normalized)].filter(Boolean).slice(0, 8);
  }

  private cleanNullable(value: string | null | undefined) {
    if (value === null || value === undefined) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private readonly repositorySelect = {
    id: true,
    ownerId: true,
    sourcePromptId: true,
    rootPromptId: true,
    title: true,
    slug: true,
    description: true,
    aiCompatibility: true,
    visibility: true,
    status: true,
    copyCount: true,
    saveCount: true,
    likeCount: true,
    license: true,
    createdAt: true,
    updatedAt: true,
    owner: {
      select: {
        username: true,
        status: true,
        profile: { select: { displayName: true, avatar: true } },
      },
    },
    category: { select: { name: true, slug: true } },
    sourcePrompt: {
      select: {
        title: true,
        slug: true,
        owner: { select: { username: true } },
      },
    },
    promptTags: {
      select: { tag: { select: { id: true, name: true, slug: true } } },
    },
    currentVersion: {
      select: {
        id: true,
        versionNumber: true,
        content: true,
        changelog: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        variables: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            defaultValue: true,
            required: true,
          },
        },
        examples: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            title: true,
            input: true,
            output: true,
            sortOrder: true,
          },
        },
        evidenceImages: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            secureUrl: true,
            originalFilename: true,
            mimeType: true,
            altText: true,
            caption: true,
            sortOrder: true,
          },
        },
      },
    },
  } as const;

  private readonly versionSelect = {
    id: true,
    versionNumber: true,
    content: true,
    changelog: true,
    status: true,
    publishedAt: true,
    createdAt: true,
    updatedAt: true,
    author: { select: { username: true } },
    variables: {
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        defaultValue: true,
        required: true,
      },
    },
    examples: {
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        title: true,
        input: true,
        output: true,
        sortOrder: true,
      },
    },
    evidenceImages: {
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        secureUrl: true,
        originalFilename: true,
        mimeType: true,
        altText: true,
        caption: true,
        sortOrder: true,
      },
    },
  } as const;
}

export interface LineageNode {
  id: string;
  title: string;
  slug: string;
  ownerUsername: string;
  variantCount: number;
  children: LineageNode[];
}
