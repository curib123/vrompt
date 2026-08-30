import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  PromptRepositoryStatus,
  PromptVersionStatus,
  PromptVisibility,
} from '@prisma/client';

import { slugify } from '../common/slug';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePromptRepositoryDto } from './dto/create-prompt-repository.dto';
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
}
