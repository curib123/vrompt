import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AIModel, GenerationStatus, Prisma, RoutingMode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaService } from './quota.service';
import { ModelRegistryService, rankModels } from './registry.service';
import {
  emptyUsage,
  estimateCost,
  NormalizedUsage,
  ProviderFailure,
  ProviderRegistry,
} from './providers';
import { AttachmentService } from './attachment.service';
import { SendMessageDto } from './workspace.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quota: QuotaService,
    private readonly registry: ModelRegistryService,
    private readonly providers: ProviderRegistry,
    private readonly files: AttachmentService,
  ) {}
  async owned(userId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, userId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }
  async models(userId: string) {
    const { policies } = await this.quota.policies(userId);
    return (await this.registry.available())
      .filter(
        (m) => m.manualAvailable && policies.some((p) => p.modelId === m.id),
      )
      .map((m) => ({
        id: m.id,
        provider: m.provider,
        displayName: m.displayName,
        description: m.description,
        capabilities: m.capabilities,
      }));
  }
  async generate(
    userId: string,
    conversationId: string,
    input: SendMessageDto,
    signal: AbortSignal,
    emit: (event: unknown) => void,
  ) {
    await this.owned(userId, conversationId);
    const { policies, subscription } = await this.quota.policies(userId);
    const policy = policies.find(
      (p) => p.bucket === (input.mode === 'AUTO' ? 'AUTO' : input.modelId),
    );
    if (!policy)
      throw new ForbiddenException(
        'This selection is not included in your plan.',
      );
    if (!policy.allowedFeatures.includes(input.feature ?? 'chat'))
      throw new ForbiddenException(
        'This task is not included in your allowance.',
      );
    if (input.content.length > policy.maxInputChars)
      throw new BadRequestException('Message exceeds your plan’s input limit.');
    const files = await this.files.forConversation(userId, conversationId);
    if (
      files.length > policy.maxFiles ||
      files.some((f) => f.data.length > policy.maxFileBytes)
    )
      throw new BadRequestException('Files exceed this selection’s allowance.');
    let history = await this.prisma.message.findMany({
      where: { conversationId, status: 'SUCCEEDED' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    if (input.regenerateMessageId) {
      const index = history.findIndex(
        (m) => m.id === input.regenerateMessageId && m.role === 'assistant',
      );
      if (index < 1 || history[index - 1]?.role !== 'user')
        throw new BadRequestException(
          'Choose a completed assistant message to regenerate.',
        );
      input.content = history[index - 1]!.content;
      history = history.slice(0, index - 1);
    }
    const messages = [
      ...history.map((m) => ({ role: m.role, content: m.content || '[Generated image in this conversation; image bytes are not attached to this request.]' })),
      { role: 'user', content: input.content },
    ];
    // Conservative UTF-8 byte ceiling avoids silently truncating conversation history.
    const context =
      messages.reduce((sum, m) => sum + Buffer.byteLength(m.content) + 16, 0) +
      files.reduce((sum, f) => sum + f.data.length, 0);
    if (context + policy.maxOutput > policy.maxContext)
      throw new BadRequestException(
        'This conversation exceeds the context limit. Start a new chat or remove files.',
      );
    const capabilities = [
      'text',
      ...(input.feature === 'image_generation' ? ['image_generation'] : []),
      ...(files.some((f) => f.mimeType.startsWith('image/')) ? ['vision'] : []),
      ...(files.some((f) => f.mimeType === 'application/pdf') ? ['files'] : []),
    ];
    const available = (await this.registry.available()).filter(
      (m) =>
        !(
          m.provider === 'MISTRAL' &&
          files.some((f) => f.mimeType === 'application/pdf')
        ) &&
        !(
          input.feature === 'image_generation' &&
          !['OPENAI', 'GOOGLE', 'MISTRAL'].includes(m.provider)
        ),
    );
    const permitted = available.filter((m) =>
      input.mode === 'AUTO'
        ? policies.some((p) => p.bucket === 'AUTO')
        : policies.some((p) => p.modelId === m.id),
    );
    let candidates: AIModel[];
    if (input.mode === 'MANUAL') {
      candidates = permitted.filter(
        (m) => m.id === input.modelId && m.manualAvailable,
      );
      if (!candidates.length)
        throw new ServiceUnavailableException(
          'This model is temporarily unavailable. Use recommended alternative.',
        );
      if (
        capabilities.some((c) => !candidates[0]!.capabilities.includes(c)) ||
        context + policy.maxOutput > candidates[0]!.maxContext
      )
        throw new BadRequestException(
          'This model does not support the files or context in this conversation.',
        );
    } else {
      candidates = rankModels(
        permitted.filter((m) => m.autoAvailable),
        policy,
        input.content,
        capabilities,
        context + policy.maxOutput,
      );
      if (!candidates.length)
        throw new ServiceUnavailableException(
          'No suitable Auto model is available for this request.',
        );
    }
    const original = candidates[0]!;
    if (original.fallbackId && input.mode === 'AUTO')
      candidates = [
        original,
        ...candidates.filter((m) => m.id === original.fallbackId),
        ...candidates.filter(
          (m) => m.id !== original.id && m.id !== original.fallbackId,
        ),
      ];
    const fingerprint = createHash('sha256')
      .update(JSON.stringify({ conversationId, input }))
      .digest('hex');
    await this.quota.reserve(userId, input.requestId, fingerprint, policy);
    let text = '';
    const artifacts: {
      id: string;
      name: string;
      mimeType: string;
      size: number;
    }[] = [];
    let status: GenerationStatus = 'FAILED';
    let assistantId: string | undefined;
    let actual = original;
    let mode: RoutingMode = input.mode;
    let failureReason: string | null = null;
    let consumed = false;
    const usageRecords: Prisma.UsageRecordUncheckedCreateInput[] = [];
    const deadline = AbortSignal.timeout(policy.maxDurationSeconds * 1000);
    const combined = AbortSignal.any([signal, deadline]);
    try {
      await this.prisma.message.create({
        data: { conversationId, role: 'user', content: input.content },
      });
      const assistant = await this.prisma.message.create({
        data: {
          conversationId,
          role: 'assistant',
          generationId: input.requestId,
          status: 'RESERVED',
          provider: original.provider,
          modelName: original.displayName,
          routingMode: input.mode,
        },
      });
      assistantId = assistant.id;
      for (const [index, model] of candidates.entries()) {
        if (combined.aborted) throw new ProviderFailure('CANCELLED', false);
        actual = model;
        mode = index ? 'FALLBACK' : input.mode;
        emit({
          type: 'model',
          model: model.displayName,
          mode,
          requestId: input.requestId,
        });
        const start = Date.now();
        const usage = emptyUsage();
        let attemptStatus: GenerationStatus = 'FAILED';
        let errorCategory: string | undefined;
        try {
          await this.providers.get(model.provider).stream(
            model,
            messages,
            files,
            Math.min(policy.maxOutput, model.maxOutput),
            combined,
            (delta) => {
              text += delta;
              emit({ type: 'delta', text: delta });
            },
            usage,
            {
              feature: input.feature,
              image: async (mimeType, base64) => {
                consumed = true;
                if (artifacts.length >= 4)
                  throw new ProviderFailure('OUTPUT_LIMIT', false);
                const artifact = await this.files.saveGenerated(
                  userId,
                  conversationId,
                  mimeType,
                  base64,
                );
                artifacts.push(artifact);
                emit({ type: 'artifact', artifact });
              },
            },
          );
          if (!text.trim() && !artifacts.length)
            throw new ProviderFailure('EMPTY_RESPONSE');
          if (input.feature === 'image_generation' && !artifacts.length)
            throw new ProviderFailure('NO_IMAGE_RETURNED', false);
          attemptStatus = 'SUCCEEDED';
          status = 'SUCCEEDED';
          consumed = true;
        } catch (error) {
          errorCategory = combined.aborted
            ? signal.aborted
              ? 'CANCELLED'
              : 'TIMEOUT'
            : error instanceof ProviderFailure
              ? error.category
              : 'NETWORK_ERROR';
          attemptStatus = combined.aborted
            ? 'CANCELLED'
            : text || artifacts.length
              ? 'INTERRUPTED'
              : 'FAILED';
          status = attemptStatus;
          consumed ||= Boolean(text.trim()) || usage.input + usage.output > 0;
          failureReason = errorCategory;
          if (
            input.mode === 'MANUAL' ||
            consumed ||
            text ||
            combined.aborted ||
            (error instanceof ProviderFailure && !error.retryable) ||
            index === candidates.length - 1
          )
            throw error;
        } finally {
          if (
            input.feature === 'image_generation' ||
            (model.provider === 'GOOGLE' &&
              model.capabilities.includes('image_generation'))
          )
            usage.raw.toolCostUnverified = true;
          if (!usage.reported) {
            usage.input = context;
            usage.output = Buffer.byteLength(text); // explicitly estimated, including failed attempts
          }
          usageRecords.push(
            this.record(
              userId,
              input.requestId,
              conversationId,
              assistantId,
              subscription?.id,
              model,
              original.id,
              mode,
              failureReason,
              usage,
              Date.now() - start,
              attemptStatus,
              errorCategory,
            ),
          );
        }
        if (status === 'SUCCEEDED') break;
        emit({
          type: 'fallback',
          message: 'Auto is trying another compatible model.',
        });
      }
    } catch {
      emit({
        type: 'error',
        message:
          failureReason === 'NO_IMAGE_RETURNED'
            ? 'The model returned no image. Try a different prompt or image-capable model.'
            : input.mode === 'MANUAL'
              ? 'This model is temporarily unavailable. Use recommended alternative.'
              : combined.aborted
                ? 'Generation stopped.'
                : 'No response was completed. Please try again.',
      });
    } finally {
      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
        await this.quota.finalizeIn(tx, input.requestId, status, consumed);
        if (assistantId)
          await tx.message.updateMany({
            where: { id: assistantId },
            data: {
              content: text,
              artifacts,
              status,
              modelName: actual.displayName,
              provider: actual.provider,
              routingMode: mode,
            },
          });
        if (usageRecords.length)
          await tx.usageRecord.createMany({ data: usageRecords });
        await tx.conversation.updateMany({
          where: { id: conversationId, userId },
          data: { updatedAt: new Date() },
        });
      });
    }
    emit({
      type: 'done',
      status,
      consumed,
      messageId: assistantId,
      usage: await this.quota.usage(userId),
    });
  }
  private record(
    userId: string,
    requestId: string,
    conversationId: string,
    messageId: string | undefined,
    subscriptionId: string | undefined,
    model: AIModel,
    originalModelId: string,
    routingMode: RoutingMode,
    fallbackReason: string | null,
    usage: NormalizedUsage,
    latencyMs: number,
    status: GenerationStatus,
    errorCategory?: string,
  ): Prisma.UsageRecordUncheckedCreateInput {
    return {
      userId,
      requestId,
      conversationId,
      messageId,
      subscriptionId,
      modelId: model.id,
      modelName: model.displayName,
      provider: model.provider,
      providerModelId: model.providerModelId,
      originalModelId,
      routingMode,
      fallbackReason,
      inputTokens: usage.input,
      cachedInputTokens: usage.cached,
      outputTokens: usage.output,
      reasoningTokens: usage.reasoning,
      providerUsage: usage.raw as Prisma.InputJsonValue,
      pricingSnapshot: {
        input: model.inputPrice.toString(),
        cached: model.cachedInputPrice.toString(),
        output: model.outputPrice.toString(),
        additional: model.additionalPrices,
      },
      estimatedCost: estimateCost(model, usage),
      costEstimated: !usage.reported || Boolean(usage.raw.toolCostUnverified),
      currency: model.currency,
      latencyMs,
      status,
      errorCategory,
    };
  }
}
