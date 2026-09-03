import { Injectable } from '@nestjs/common';
import { PromptRepositoryStatus, PromptVisibility } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type { AiPromptDraft } from './ai.types';

@Injectable()
export class AiQualityService {
  constructor(private readonly prismaService: PrismaService) {}

  validateDraft(value: unknown): AiPromptDraft {
    if (!value || typeof value !== 'object')
      throw new Error('Malformed AI output');
    const draft = value as Partial<AiPromptDraft>;
    const title = typeof draft.title === 'string' ? draft.title.trim() : '';
    const description =
      typeof draft.description === 'string' ? draft.description.trim() : '';
    const content =
      typeof draft.content === 'string' ? draft.content.trim() : '';
    if (title.length < 5 || title.length > 160)
      throw new Error('Generated title is invalid');
    if (description.length < 20 || description.length > 5000)
      throw new Error('Generated description is invalid');
    if (content.length < 80 || content.length > 100000)
      throw new Error('Generated prompt is invalid');
    if (
      /^(write a prompt|you are an ai assistant|help the user)$/i.test(title)
    ) {
      throw new Error('Generated title is too generic');
    }
    if (
      !/(role|objective|goal|task|context|output|requirements|constraints)/i.test(
        content,
      )
    ) {
      throw new Error('Generated prompt lacks useful structure');
    }

    const rawVariables: unknown = draft.variables;
    const variables = Array.isArray(rawVariables)
      ? rawVariables
          .filter((item): item is Record<string, unknown> =>
            Boolean(item && typeof item === 'object'),
          )
          .map((item) => ({
            name: typeof item.name === 'string' ? item.name.trim() : '',
            description:
              typeof item.description === 'string'
                ? item.description.trim()
                : undefined,
            defaultValue:
              typeof item.defaultValue === 'string'
                ? item.defaultValue
                : undefined,
            required: item.required === true,
          }))
          .filter((item) => item.name.length > 0 && item.name.length <= 80)
          .slice(0, 20)
      : [];
    const tags = Array.isArray(draft.tags)
      ? draft.tags
          .filter((tag): tag is string => typeof tag === 'string')
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 8)
      : [];
    return {
      title,
      description,
      content,
      variables,
      tags,
      ...(typeof draft.categorySlug === 'string'
        ? { categorySlug: draft.categorySlug.trim().toLowerCase() }
        : {}),
      ...(typeof draft.audienceSlug === 'string'
        ? { audienceSlug: draft.audienceSlug.trim().toLowerCase() }
        : {}),
    };
  }

  async findDuplicate(draft: AiPromptDraft, includePrivate = false) {
    const visibility = includePrivate
      ? undefined
      : { in: [PromptVisibility.PUBLIC, PromptVisibility.UNLISTED] };
    const exact = await this.prismaService.promptRepository.findFirst({
      where: {
        status: PromptRepositoryStatus.ACTIVE,
        ...(visibility ? { visibility } : {}),
        OR: [
          { title: { equals: draft.title, mode: 'insensitive' } },
          { currentVersion: { content: { equals: draft.content } } },
        ],
      },
      select: { id: true, title: true, slug: true },
    });
    if (exact) return exact;

    const candidates = await this.prismaService.promptRepository.findMany({
      where: {
        status: PromptRepositoryStatus.ACTIVE,
        ...(visibility ? { visibility } : {}),
      },
      take: 250,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        currentVersion: { select: { content: true } },
      },
    });
    const words = new Set(this.tokens(draft.content));
    let best: (typeof candidates)[number] | undefined;
    let bestScore = 0;
    for (const candidate of candidates) {
      const other = new Set(
        this.tokens(candidate.currentVersion?.content ?? ''),
      );
      const intersection = [...words].filter((word) => other.has(word)).length;
      const union = new Set([...words, ...other]).size;
      const score = union ? intersection / union : 0;
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    return bestScore >= 0.82 ? best : null;
  }

  private tokens(value: string) {
    return value.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [];
  }
}
