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
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

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
  private readonly guestSaveTokens = new Map<string, string>();

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
    if (!user && (input.categorySlug || input.audienceSlug)) {
      throw new BadRequestException(
        'Category and audience options are available after signing in',
      );
    }
    const requestedOperation =
      input.operation ?? AiGenerationOperation.GENERATE;
    if (
      requestedOperation !== AiGenerationOperation.GENERATE &&
      !entitlements.advancedTools
    ) {
      throw new ForbiddenException('Sign in to use prompt refinement tools.');
    }
    const normalized = this.normalizeInput(input, entitlements.maxInputChars);
    const subjectKey = user?.id
      ? `user:${user.id}`
      : this.guestSubjectKey(guestKey);
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
      remaining:
        entitlements.dailyGenerationLimit === null
          ? null
          : Math.max(entitlements.dailyGenerationLimit - used, 0),
      resetAt: resetAt.toISOString(),
      advancedTools: entitlements.advancedTools,
      generationEnabled: entitlements.generationEnabled,
    };
  }

  async usageForGuest(guestKey: string) {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const entitlements = await this.entitlements.forUser();
    const used = await this.prismaService.aiUsageEvent.count({
      where: {
        subjectKey: this.guestSubjectKey(guestKey),
        mode: AiGenerationMode.PUBLIC,
        createdAt: { gte: start },
      },
    });
    const resetAt = new Date(start.getTime() + 86_400_000);
    return {
      plan: entitlements.plan,
      used,
      limit: entitlements.dailyGenerationLimit,
      remaining:
        entitlements.dailyGenerationLimit === null
          ? null
          : Math.max(entitlements.dailyGenerationLimit - used, 0),
      resetAt: resetAt.toISOString(),
      advancedTools: false,
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

  async reviewInternal(
    generationId: string,
    action: 'REJECT' | 'PUBLISH',
    actorId: string,
  ) {
    const generation = await this.prismaService.aiGeneration.findUnique({
      where: { id: generationId },
    });
    if (
      !generation ||
      generation.mode !== AiGenerationMode.INTERNAL ||
      generation.status !== AiGenerationStatus.SUCCEEDED ||
      generation.reviewDecision
    ) {
      throw new ConflictException(
        'Internal generation is not ready for review',
      );
    }
    if (action === 'REJECT') {
      await this.prismaService.$transaction(async (transaction) => {
        const claimed = await transaction.aiGeneration.updateMany({
          where: { id: generation.id, reviewDecision: null },
          data: {
            status: AiGenerationStatus.REJECTED,
            reviewDecision: 'REJECTED',
            reviewedAt: new Date(),
          },
        });
        if (!claimed.count)
          throw new ConflictException('Generation was already reviewed');
        await transaction.auditLog.create({
          data: {
            actorId,
            action: 'AI_GENERATION_REJECTED',
            targetType: 'GENERATION',
            targetId: generation.id,
          },
        });
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
    await this.prismaService.$transaction(async (transaction) => {
      const claimed = await transaction.aiGeneration.updateMany({
        where: { id: generation.id, reviewDecision: null },
        data: { reviewDecision: 'PUBLISHED', reviewedAt: new Date() },
      });
      if (!claimed.count)
        throw new ConflictException('Generation was already reviewed');
      await transaction.promptVersion.update({
        where: { id: repository.currentVersionId! },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      });
      await transaction.promptRepository.update({
        where: { id: repository.id },
        data: { visibility: 'PUBLIC', origin: 'AI_GENERATED' },
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: 'AI_GENERATION_PUBLISHED',
          targetType: 'GENERATION',
          targetId: generation.id,
          metadata: { repositoryId: repository.id },
        },
      });
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
      (mode === AiGenerationMode.PUBLIC &&
        generation.requesterId !== userId &&
        !this.validGuestSaveToken(
          generation.guestSaveTokenHash,
          input?.saveToken,
        )) ||
      generation.status !== AiGenerationStatus.SUCCEEDED ||
      !generation.output
    ) {
      throw new ConflictException('Generated prompt is not ready to save');
    }
    if (generation.repositoryId) {
      return { id: generation.repositoryId, alreadySaved: true };
    }

    const saveKey = `vrompt:ai:save:${generation.id}`;
    await this.reserveRedisCounter(
      saveKey,
      60,
      1,
      'This generated prompt is already being saved.',
    );

    try {
      const latest = await this.prismaService.aiGeneration.findUniqueOrThrow({
        where: { id: generation.id },
      });
      if (latest.repositoryId) {
        return { id: latest.repositoryId, alreadySaved: true };
      }
      const draft = this.quality.validateDraft({
        ...(generation.output as object),
        ...(input?.title !== undefined ? { title: input.title.trim() } : {}),
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
          data: { repositoryId: created.id, guestSaveTokenHash: null },
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
      this.guestSaveTokens.delete(generation.id);
      return { id: created.id, slug: created.slug, alreadySaved: false };
    } finally {
      await this.redis.decrement(saveKey);
    }
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
    limit: number | null;
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
      if (existing.status !== AiGenerationStatus.SUCCEEDED) {
        throw new ConflictException(
          existing.status === AiGenerationStatus.REQUESTED
            ? 'This generation request is already in progress'
            : 'This generation request did not complete successfully',
        );
      }
      return this.publicResult(existing);
    }

    let generation;
    const guestSaveToken =
      context.mode === AiGenerationMode.PUBLIC && !context.userId
        ? this.guestSaveToken()
        : undefined;
    try {
      generation = await this.prismaService.aiGeneration.create({
        data: {
          requesterId: context.userId,
          guestSaveTokenHash: guestSaveToken
            ? this.hashGuestSaveToken(guestSaveToken)
            : undefined,
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
      if (guestSaveToken)
        this.guestSaveTokens.set(generation.id, guestSaveToken);
    } catch (error) {
      await this.quota
        .complete(reservation.event.id, AiGenerationStatus.FAILED)
        .catch(() => undefined);
      await this.redis.decrement(`${guardKey}:concurrency`);
      throw error;
    }

    try {
      const response = await this.provider.generate({
        system: this.systemPrompt(context.mode),
        user: this.userPrompt(context.input),
        safetyIdentifier: createHash('sha256')
          .update(context.subjectKey)
          .digest('hex'),
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
          providerResponseId: response.responseId,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          totalTokens: response.totalTokens,
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
    const basePrompt = input.basePrompt?.trim() || undefined;
    if (
      goal.length > maxInputChars ||
      (basePrompt?.length ?? 0) > maxInputChars ||
      goal.length + (basePrompt?.length ?? 0) > maxInputChars
    ) {
      throw new BadRequestException(
        `AI input must be ${maxInputChars} characters or fewer`,
      );
    }
    return {
      goal,
      categorySlug: input.categorySlug?.trim().toLowerCase() || undefined,
      audienceSlug: input.audienceSlug?.trim().toLowerCase() || undefined,
      operation: input.operation ?? AiGenerationOperation.GENERATE,
      basePrompt,
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

  private guestSubjectKey(guestKey: string) {
    return `guest:${createHmac(
      'sha256',
      this.configService.get<string>(
        'JWT_ACCESS_SECRET',
        'local-development-access-secret-change-me',
      ),
    )
      .update(guestKey)
      .digest('hex')}`;
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
    requesterId?: string | null;
  }) {
    const saveToken = this.guestSaveTokens.get(generation.id);
    return {
      id: generation.id,
      status: generation.status,
      output: generation.output as AiPromptDraft | null,
      createdAt: generation.createdAt,
      ...(saveToken ? { saveToken } : {}),
    };
  }

  private guestSaveToken() {
    return randomBytes(32).toString('hex');
  }

  private hashGuestSaveToken(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private validGuestSaveToken(hash: string | null, token?: string) {
    if (!hash || !token) return false;
    const candidate = Buffer.from(this.hashGuestSaveToken(token), 'hex');
    const expected = Buffer.from(hash, 'hex');
    return (
      candidate.length === expected.length &&
      timingSafeEqual(candidate, expected)
    );
  }
}
