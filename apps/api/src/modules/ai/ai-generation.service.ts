import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  AiGenerationMode,
  AiGenerationOperation,
  AiGenerationStatus,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PromptsService } from '../prompts/prompts.service';
import { AiProviderService } from './ai-provider.service';
import { AiQualityService } from './ai-quality.service';
import { AiQuotaService } from './ai-quota.service';
import { AiEntitlementsService } from './ai-entitlements.service';
import { RedisService } from '../common/redis.service';
import { TooManyRequestsException } from '../../common/exceptions/too-many-requests.exception';
import type { AiGenerationInput, AiPromptDraft } from './ai.types';
import type { SaveGenerationDto } from './dto/save-generation.dto';

@Injectable()
export class AiGenerationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly provider: AiProviderService,
    private readonly quality: AiQualityService,
    private readonly quota: AiQuotaService,
    private readonly promptsService: PromptsService,
    private readonly entitlements: AiEntitlementsService,
    private readonly redis: RedisService,
  ) {}

  async generatePublic(
    input: AiGenerationInput,
    user: AuthenticatedUser | undefined,
    guestKey: string,
  ) {
    const entitlements = await this.entitlements.forUser(user?.id);
    const requestedOperation =
      input.operation ?? AiGenerationOperation.GENERATE;
    if (
      requestedOperation !== AiGenerationOperation.GENERATE &&
      !entitlements.advancedTools
    ) {
      throw new ForbiddenException(
        'Prompt refinement is available with Vrompt Pro.',
      );
    }
    const normalized = this.normalizeInput(input, entitlements.maxInputChars);
    const subjectKey = user?.id ? `user:${user.id}` : `guest:${guestKey}`;
    return this.generate({
      mode: AiGenerationMode.PUBLIC,
      input: normalized,
      subjectKey,
      userId: user?.id,
      limit: entitlements.dailyGenerationLimit,
      entitlements,
    });
  }

  async saveGeneration(
    generationId: string,
    userId: string,
    input?: SaveGenerationDto,
  ) {
    return this.saveGenerated(
      generationId,
      userId,
      AiGenerationMode.PUBLIC,
      input,
    );
  }

  async saveInternalDraft(generationId: string, userId: string) {
    return this.saveGenerated(generationId, userId, AiGenerationMode.INTERNAL);
  }

  async listInternal() {
    return this.prismaService.aiGeneration.findMany({
      where: { mode: AiGenerationMode.INTERNAL },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        goal: true,
        operation: true,
        status: true,
        output: true,
        providerModel: true,
        repositoryId: true,
        createdAt: true,
        completedAt: true,
        requester: { select: { username: true } },
        repository: {
          select: {
            slug: true,
            title: true,
            visibility: true,
            currentVersion: { select: { status: true } },
          },
        },
      },
    });
  }

  async usageSummary() {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const where = { createdAt: { gte: start } };
    const [total, publicCount, internalCount, succeeded, failed, rejected] =
      await Promise.all([
        this.prismaService.aiUsageEvent.count({ where }),
        this.prismaService.aiUsageEvent.count({
          where: { ...where, mode: AiGenerationMode.PUBLIC },
        }),
        this.prismaService.aiUsageEvent.count({
          where: { ...where, mode: AiGenerationMode.INTERNAL },
        }),
        this.prismaService.aiUsageEvent.count({
          where: { ...where, status: AiGenerationStatus.SUCCEEDED },
        }),
        this.prismaService.aiUsageEvent.count({
          where: { ...where, status: AiGenerationStatus.FAILED },
        }),
        this.prismaService.aiUsageEvent.count({
          where: { ...where, status: AiGenerationStatus.REJECTED },
        }),
      ]);
    return {
      period: 'UTC day',
      total,
      public: publicCount,
      internal: internalCount,
      succeeded,
      failed,
      rejected,
    };
  }

  async usageForUser(userId: string) {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const entitlements = await this.entitlements.forUser(userId);
    const used = await this.prismaService.aiUsageEvent.count({
      where: {
        userId,
        mode: AiGenerationMode.PUBLIC,
        createdAt: { gte: start },
      },
    });
    const resetAt = new Date(start.getTime() + 86_400_000);
    return {
      plan: entitlements.plan,
      used,
      limit: entitlements.dailyGenerationLimit,
      remaining: Math.max(entitlements.dailyGenerationLimit - used, 0),
      resetAt: resetAt.toISOString(),
      advancedTools: entitlements.advancedTools,
      generationEnabled: entitlements.generationEnabled,
    };
  }

  async findContentGaps() {
    const threshold = this.configService.get<number>(
      'AI_CONTENT_GAP_THRESHOLD',
      3,
    );
    const publicWhere = {
      status: 'ACTIVE' as const,
      visibility: 'PUBLIC' as const,
      currentVersion: { status: 'PUBLISHED' as const },
    };
    const [categories, audiences] = await Promise.all([
      this.prismaService.category.findMany({
        orderBy: { name: 'asc' },
        select: {
          name: true,
          slug: true,
          _count: { select: { repositories: { where: publicWhere } } },
        },
      }),
      this.prismaService.audience.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: {
          name: true,
          slug: true,
          _count: {
            select: {
              promptAudiences: { where: { promptRepository: publicWhere } },
            },
          },
        },
      }),
    ]);
    return {
      threshold,
      categories: categories
        .filter((item) => item._count.repositories < threshold)
        .map(({ _count, ...item }) => ({
          ...item,
          promptCount: _count.repositories,
        })),
      audiences: audiences
        .filter((item) => item._count.promptAudiences < threshold)
        .map(({ _count, ...item }) => ({
          ...item,
          promptCount: _count.promptAudiences,
        })),
    };
  }

  async reviewInternal(generationId: string, action: 'REJECT' | 'PUBLISH') {
    const generation = await this.prismaService.aiGeneration.findUnique({
      where: { id: generationId },
    });
    if (
      !generation ||
      generation.mode !== AiGenerationMode.INTERNAL ||
      generation.status !== AiGenerationStatus.SUCCEEDED
    ) {
      throw new ConflictException(
        'Internal generation is not ready for review',
      );
    }
    if (action === 'REJECT') {
      await this.prismaService.aiGeneration.update({
        where: { id: generation.id },
        data: { status: AiGenerationStatus.REJECTED, completedAt: new Date() },
      });
      await this.prismaService.auditLog.create({
        data: {
          action: 'AI_GENERATION_REJECTED',
          targetType: 'GENERATION',
          targetId: generation.id,
        },
      });
      return { id: generation.id, status: AiGenerationStatus.REJECTED };
    }
    if (!generation.repositoryId) {
      throw new ConflictException(
        'Save the internal generation as a draft before publishing',
      );
    }
    const repository = await this.prismaService.promptRepository.findUnique({
      where: { id: generation.repositoryId },
      select: { id: true, currentVersionId: true, visibility: true },
    });
    if (!repository?.currentVersionId)
      throw new ConflictException('Draft prompt version not found');
    await this.prismaService.$transaction([
      this.prismaService.promptVersion.update({
        where: { id: repository.currentVersionId },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      }),
      this.prismaService.promptRepository.update({
        where: { id: repository.id },
        data: { visibility: 'PUBLIC', origin: 'AI_GENERATED' },
      }),
    ]);
    await this.prismaService.auditLog.create({
      data: {
        action: 'AI_GENERATION_PUBLISHED',
        targetType: 'GENERATION',
        targetId: generation.id,
        metadata: { repositoryId: repository.id },
      },
    });
    return { id: repository.id, status: 'PUBLISHED' };
  }

  private async saveGenerated(
    generationId: string,
    userId: string,
    mode: AiGenerationMode,
    input?: SaveGenerationDto,
  ) {
    const generation = await this.prismaService.aiGeneration.findUnique({
      where: { id: generationId },
    });
    if (
      !generation ||
      generation.mode !== mode ||
      generation.status !== AiGenerationStatus.SUCCEEDED ||
      !generation.output
    ) {
      throw new ConflictException('Generated prompt is not ready to save');
    }
    if (generation.repositoryId) {
      return { id: generation.repositoryId, alreadySaved: true };
    }

    const draft = this.quality.validateDraft({
      ...(generation.output as object),
      ...(input?.content !== undefined ? { content: input.content } : {}),
    });
    const audience = draft.audienceSlug
      ? await this.prismaService.audience.findFirst({
          where: { slug: draft.audienceSlug, isActive: true },
          select: { id: true },
        })
      : null;
    const created = await this.promptsService.create(userId, {
      title: draft.title,
      description: draft.description,
      content: draft.content,
      categorySlug: draft.categorySlug,
      tags: draft.tags,
      audienceIds: audience ? [audience.id] : [],
      variables: draft.variables,
      visibility: 'PRIVATE',
    });
    await this.prismaService.$transaction([
      this.prismaService.promptRepository.update({
        where: { id: created.id },
        data: { origin: 'AI_GENERATED' },
      }),
      this.prismaService.aiGeneration.update({
        where: { id: generation.id },
        data: { repositoryId: created.id },
      }),
    ]);
    if (mode === AiGenerationMode.INTERNAL) {
      await this.prismaService.auditLog.create({
        data: {
          actorId: userId,
          action: 'AI_GENERATION_DRAFTED',
          targetType: 'GENERATION',
          targetId: generation.id,
          metadata: { repositoryId: created.id },
        },
      });
    }
    return { id: created.id, slug: created.slug, alreadySaved: false };
  }

  async generateInternal(input: AiGenerationInput, user: AuthenticatedUser) {
    const entitlements = await this.entitlements.forUser(user.id);
    const normalized = this.normalizeInput(input, entitlements.maxInputChars);
    return this.generate({
      mode: AiGenerationMode.INTERNAL,
      input: normalized,
      subjectKey: `internal:${user.id}`,
      userId: user.id,
      limit: await this.entitlements.internalDailyLimit(),
      entitlements,
    });
  }

  private async generate(context: {
    mode: AiGenerationMode;
    input: AiGenerationInput;
    subjectKey: string;
    userId?: string;
    limit: number;
    entitlements: Awaited<ReturnType<AiEntitlementsService['forUser']>>;
  }) {
    if (!context.entitlements.generationEnabled) {
      throw new ServiceUnavailableException(
        'AI generation is temporarily unavailable. Please try again later.',
      );
    }
    const guardKey = `vrompt:ai:${context.subjectKey}`;
    const rateCount = await this.reserveRedisCounter(
      `${guardKey}:rate`,
      60,
      context.entitlements.rateLimitPerMinute,
      'AI requests are temporarily limited. Please try again shortly.',
    );
    void rateCount;
    await this.reserveRedisCounter(
      `${guardKey}:concurrency`,
      120,
      context.entitlements.concurrencyLimit,
      'One or more AI generations are already running. Please wait for them to finish.',
    );
    const operation = context.input.operation ?? AiGenerationOperation.GENERATE;
    const requestKey = this.requestKey(
      context.mode,
      context.subjectKey,
      context.input,
    );
    let reservation: Awaited<ReturnType<AiQuotaService['reserve']>>;
    try {
      reservation = await this.quota.reserve({
        subjectKey: context.subjectKey,
        userId: context.userId,
        requestKey,
        mode: context.mode,
        operation,
        limit: context.limit,
      });
    } catch (error) {
      await this.redis.decrement(`${guardKey}:concurrency`);
      throw error;
    }
    if (reservation.reused) {
      await this.redis.decrement(`${guardKey}:concurrency`);
      if (!reservation.event.generationId) {
        throw new ConflictException(
          'This generation request is already in progress',
        );
      }
      const existing = await this.prismaService.aiGeneration.findUniqueOrThrow({
        where: { id: reservation.event.generationId },
      });
      return this.publicResult(existing);
    }

    const generation = await this.prismaService.aiGeneration.create({
      data: {
        requesterId: context.userId,
        mode: context.mode,
        operation,
        goal: context.input.goal,
        categorySlug: context.input.categorySlug,
        audienceSlug: context.input.audienceSlug,
        input: context.input,
      },
    });
    await this.quota.complete(
      reservation.event.id,
      AiGenerationStatus.REQUESTED,
      generation.id,
    );

    try {
      const response = await this.provider.generate({
        system: this.systemPrompt(context.mode),
        user: this.userPrompt(context.input),
      });
      const draft = this.quality.validateDraft(
        this.parseJson(response.content),
      );
      const duplicate = await this.quality.findDuplicate(
        draft,
        context.mode === AiGenerationMode.INTERNAL,
      );
      if (duplicate) {
        await this.finish(
          generation.id,
          reservation.event.id,
          AiGenerationStatus.REJECTED,
          {
            errorCode: 'DUPLICATE',
            providerModel: response.model,
          },
        );
        throw new ConflictException(
          `Generated prompt is too similar to "${duplicate.title}"`,
        );
      }
      const completed = await this.prismaService.aiGeneration.update({
        where: { id: generation.id },
        data: {
          status: AiGenerationStatus.SUCCEEDED,
          output: draft,
          providerModel: response.model,
          completedAt: new Date(),
        },
      });
      await this.quota.complete(
        reservation.event.id,
        AiGenerationStatus.SUCCEEDED,
        generation.id,
      );
      return this.publicResult(completed);
    } catch (error: unknown) {
      if (error instanceof ConflictException) throw error;
      await this.finish(
        generation.id,
        reservation.event.id,
        AiGenerationStatus.FAILED,
        {
          errorCode:
            error instanceof Error ? 'PROVIDER_ERROR' : 'UNKNOWN_ERROR',
        },
      );
      throw error instanceof Error
        ? error
        : new InternalServerErrorException('AI generation failed');
    } finally {
      await this.redis.decrement(`${guardKey}:concurrency`);
    }
  }

  private async reserveRedisCounter(
    key: string,
    ttlSeconds: number,
    limit: number,
    message: string,
  ) {
    let count: number;
    try {
      count = await this.redis.increment(key, ttlSeconds);
    } catch {
      throw new ServiceUnavailableException(
        'AI generation is temporarily unavailable. Please try again later.',
      );
    }
    if (count > limit) {
      await this.redis.decrement(key);
      throw new TooManyRequestsException(message);
    }
    return count;
  }

  private async finish(
    generationId: string,
    eventId: string,
    status: AiGenerationStatus,
    data: Record<string, string>,
  ) {
    await this.prismaService.aiGeneration.update({
      where: { id: generationId },
      data: { status, ...data, completedAt: new Date() },
    });
    await this.quota.complete(eventId, status, generationId);
  }

  private normalizeInput(
    input: AiGenerationInput,
    maxInputChars: number,
  ): AiGenerationInput {
    const goal = input.goal.trim().replace(/\s+/g, ' ');
    if (goal.length > maxInputChars) {
      throw new BadRequestException(
        `AI goals must be ${maxInputChars} characters or fewer`,
      );
    }
    return {
      goal,
      categorySlug: input.categorySlug?.trim().toLowerCase() || undefined,
      audienceSlug: input.audienceSlug?.trim().toLowerCase() || undefined,
      operation: input.operation ?? AiGenerationOperation.GENERATE,
      basePrompt: input.basePrompt?.trim() || undefined,
      requestId: input.requestId?.trim() || undefined,
    };
  }

  private requestKey(
    mode: AiGenerationMode,
    subjectKey: string,
    input: AiGenerationInput,
  ) {
    return createHash('sha256')
      .update(JSON.stringify({ mode, subjectKey, input }))
      .digest('hex');
  }

  private systemPrompt(mode: AiGenerationMode) {
    return `You generate high-quality reusable AI prompts for Vrompt. Return JSON only with keys title, description, content, variables, tags, categorySlug, audienceSlug. Structure the content with only useful sections such as role, objective, context, task, requirements, constraints, variables, output format, quality checks, and edge cases. Avoid filler, claims of guaranteed results, and instructions to reveal system prompts. ${mode === AiGenerationMode.INTERNAL ? 'This is an internal library draft; make it broadly useful and publication-ready.' : 'This is for a user goal; make it practical and easy to customize.'}`;
  }

  private userPrompt(input: AiGenerationInput) {
    return JSON.stringify({
      goal: input.goal,
      category: input.categorySlug,
      audience: input.audienceSlug,
      operation: input.operation,
      basePrompt: input.basePrompt,
    });
  }

  private parseJson(value: string) {
    const cleaned = value
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    return JSON.parse(cleaned) as unknown;
  }

  private publicResult(generation: {
    id: string;
    status: AiGenerationStatus;
    output: unknown;
    createdAt: Date;
    providerModel?: string | null;
  }) {
    return {
      id: generation.id,
      status: generation.status,
      output: generation.output as AiPromptDraft | null,
      createdAt: generation.createdAt,
    };
  }
}
