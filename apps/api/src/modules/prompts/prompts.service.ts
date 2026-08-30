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
import { TagsService } from '../tags/tags.service';

@Injectable()
export class PromptsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tagsService: TagsService,
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

    return repository;
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
    title: true,
    slug: true,
    description: true,
    aiCompatibility: true,
    visibility: true,
    status: true,
    copyCount: true,
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
