import { Injectable } from '@nestjs/common';
import {
  AccountType,
  PromptRepositoryStatus,
  PromptVisibility,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type { SearchQueryDto } from './dto/search-query.dto';

@Injectable()
export class SearchService {
  constructor(private readonly prismaService: PrismaService) {}

  async search(input: SearchQueryDto, viewerId?: string) {
    const page = Math.max(Number(input.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(input.pageSize) || 12, 1), 30);
    const query = input.q?.trim();
    const interestIds = viewerId
      ? (
          await this.prismaService.userAudience.findMany({
            where: { userId: viewerId, audience: { isActive: true } },
            select: { audienceId: true },
          })
        ).map(({ audienceId }) => audienceId)
      : [];
    const textFilters = query
      ? [
          { title: { contains: query, mode: 'insensitive' as const } },
          { description: { contains: query, mode: 'insensitive' as const } },
          {
            owner: {
              username: { contains: query, mode: 'insensitive' as const },
            },
          },
          {
            category: {
              name: { contains: query, mode: 'insensitive' as const },
            },
          },
          {
            promptTags: {
              some: {
                tag: {
                  name: { contains: query, mode: 'insensitive' as const },
                },
              },
            },
          },
          {
            currentVersion: {
              content: { contains: query, mode: 'insensitive' as const },
            },
          },
        ]
      : undefined;
    const where = {
      status: PromptRepositoryStatus.ACTIVE,
      visibility: { in: [PromptVisibility.PUBLIC, PromptVisibility.UNLISTED] },
      ...(textFilters ? { OR: textFilters } : {}),
      ...(input.category
        ? { category: { slug: input.category.toLowerCase() } }
        : {}),
      ...(input.aiCompatibility
        ? {
            aiCompatibility: {
              contains: input.aiCompatibility.trim(),
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(input.audience
        ? {
            promptAudiences: {
              some: {
                audience: {
                  slug: input.audience.trim().toLowerCase(),
                  isActive: true,
                },
              },
            },
          }
        : {}),
    };
    const orderBy = this.orderBy(input.sort, Boolean(query));
    const useAudienceRanking =
      interestIds.length > 0 &&
      !input.audience &&
      (!input.sort || input.sort === 'relevance');
    const queryTake = useAudienceRanking
      ? Math.min(Math.max(page * pageSize, 100), 500)
      : pageSize;
    const [items, total] = await Promise.all([
      this.prismaService.promptRepository.findMany({
        where,
        skip: useAudienceRanking ? 0 : (page - 1) * pageSize,
        take: queryTake,
        orderBy,
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          aiCompatibility: true,
          visibility: true,
          copyCount: true,
          saveCount: true,
          likeCount: true,
          variantCount: true,
          updatedAt: true,
          owner: { select: { username: true, accountType: true } },
          category: { select: { name: true, slug: true } },
          promptTags: {
            select: { tag: { select: { name: true, slug: true } } },
          },
          promptAudiences: {
            orderBy: { audience: { sortOrder: 'asc' } },
            select: {
              audience: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      }),
      this.prismaService.promptRepository.count({ where }),
    ]);

    const rankedItems = useAudienceRanking
      ? [...items].sort((left, right) => {
          const leftScore = left.promptAudiences.filter(({ audience }) =>
            interestIds.includes(audience.id),
          ).length;
          const rightScore = right.promptAudiences.filter(({ audience }) =>
            interestIds.includes(audience.id),
          ).length;
          return rightScore - leftScore;
        })
      : items;

    return {
      items: useAudienceRanking
        ? rankedItems.slice((page - 1) * pageSize, page * pageSize)
        : rankedItems,
      page,
      pageSize,
      total,
      hasNextPage: page * pageSize < total,
    };
  }

  async explore(viewerId?: string) {
    const publicWhere = {
      status: PromptRepositoryStatus.ACTIVE,
      visibility: { in: [PromptVisibility.PUBLIC, PromptVisibility.UNLISTED] },
    };
    const genuineWhere = {
      ...publicWhere,
      owner: { accountType: AccountType.REAL },
    };
    const select = {
      id: true,
      title: true,
      slug: true,
      description: true,
      copyCount: true,
      saveCount: true,
      likeCount: true,
      variantCount: true,
      updatedAt: true,
      owner: { select: { username: true, accountType: true } },
      category: { select: { name: true, slug: true } },
      promptAudiences: {
        orderBy: { audience: { sortOrder: 'asc' as const } },
        select: { audience: { select: { id: true, name: true, slug: true } } },
      },
    } as const;
    const interestIds = viewerId
      ? (
          await this.prismaService.userAudience.findMany({
            where: { userId: viewerId, audience: { isActive: true } },
            select: { audienceId: true },
          })
        ).map(({ audienceId }) => audienceId)
      : [];
    const [
      featured,
      popular,
      recentlyUpdated,
      mostCopied,
      mostSaved,
      mostVariants,
      categories,
      starterCollections,
    ] = await Promise.all([
      this.prismaService.promptRepository.findMany({
        where: {
          ...publicWhere,
          owner: {
            accountType: { in: [AccountType.REAL, AccountType.OFFICIAL] },
          },
        },
        orderBy: [{ likeCount: 'desc' }, { updatedAt: 'desc' }],
        take: 6,
        select,
      }),
      this.prismaService.promptRepository.findMany({
        where: genuineWhere,
        orderBy: [{ likeCount: 'desc' }, { copyCount: 'desc' }],
        take: 6,
        select,
      }),
      this.prismaService.promptRepository.findMany({
        where: genuineWhere,
        orderBy: { updatedAt: 'desc' },
        take: 6,
        select,
      }),
      this.prismaService.promptRepository.findMany({
        where: genuineWhere,
        orderBy: { copyCount: 'desc' },
        take: 6,
        select,
      }),
      this.prismaService.promptRepository.findMany({
        where: genuineWhere,
        orderBy: { saveCount: 'desc' },
        take: 6,
        select,
      }),
      this.prismaService.promptRepository.findMany({
        where: genuineWhere,
        orderBy: { variantCount: 'desc' },
        take: 6,
        select,
      }),
      this.prismaService.category.findMany({
        orderBy: { name: 'asc' },
        take: 20,
        select: { id: true, name: true, slug: true },
      }),
      this.prismaService.collection.findMany({
        where: {
          visibility: 'PUBLIC',
          archivedAt: null,
          owner: {
            accountType: { in: [AccountType.STARTER, AccountType.OFFICIAL] },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 6,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          owner: { select: { username: true, accountType: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);

    return {
      featured,
      popular,
      recentlyUpdated,
      mostCopied,
      mostSaved,
      mostVariants,
      categories,
      starterCollections,
      recommendedForYou: await this.recommend(interestIds, publicWhere, select),
    };
  }

  private async recommend(
    interestIds: string[],
    publicWhere: {
      status: PromptRepositoryStatus;
      visibility: { in: PromptVisibility[] };
    },
    select: typeof this.exploreSelect,
  ) {
    const items = await this.prismaService.promptRepository.findMany({
      where: publicWhere,
      orderBy: [{ likeCount: 'desc' }, { updatedAt: 'desc' }],
      take: 30,
      select,
    });
    if (interestIds.length === 0) {
      return items.slice(0, 6);
    }
    return [...items]
      .sort(
        (left, right) =>
          this.audienceScore(right, interestIds) -
          this.audienceScore(left, interestIds),
      )
      .slice(0, 6);
  }

  private audienceScore(
    item: { promptAudiences: Array<{ audience: { id: string } }> },
    interestIds: string[],
  ) {
    return item.promptAudiences.filter(({ audience }) =>
      interestIds.includes(audience.id),
    ).length;
  }

  private readonly exploreSelect = {
    id: true,
    title: true,
    slug: true,
    description: true,
    copyCount: true,
    saveCount: true,
    likeCount: true,
    variantCount: true,
    updatedAt: true,
    owner: { select: { username: true, accountType: true } },
    category: { select: { name: true, slug: true } },
    promptAudiences: {
      orderBy: { audience: { sortOrder: 'asc' as const } },
      select: { audience: { select: { id: true, name: true, slug: true } } },
    },
  } as const;

  async sitemap() {
    const [prompts, profiles, collections] = await Promise.all([
      this.prismaService.promptRepository.findMany({
        where: {
          status: PromptRepositoryStatus.ACTIVE,
          visibility: PromptVisibility.PUBLIC,
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          slug: true,
          updatedAt: true,
          owner: { select: { username: true } },
        },
      }),
      this.prismaService.user.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { updatedAt: 'desc' },
        select: { username: true, updatedAt: true },
      }),
      this.prismaService.collection.findMany({
        where: { visibility: 'PUBLIC', archivedAt: null },
        orderBy: { updatedAt: 'desc' },
        select: {
          slug: true,
          updatedAt: true,
          owner: { select: { username: true } },
        },
      }),
    ]);

    return { prompts, profiles, collections };
  }

  private orderBy(sort: SearchQueryDto['sort'], hasQuery: boolean) {
    switch (sort) {
      case 'newest':
        return { createdAt: 'desc' as const };
      case 'updated':
        return { updatedAt: 'desc' as const };
      case 'copies':
        return { copyCount: 'desc' as const };
      case 'saves':
        return { saveCount: 'desc' as const };
      case 'likes':
        return { likeCount: 'desc' as const };
      default:
        return hasQuery
          ? [{ updatedAt: 'desc' as const }, { createdAt: 'desc' as const }]
          : { updatedAt: 'desc' as const };
    }
  }
}
