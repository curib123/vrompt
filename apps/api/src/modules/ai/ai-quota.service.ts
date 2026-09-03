import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  AiGenerationMode,
  AiGenerationOperation,
  AiGenerationStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiQuotaService {
  constructor(private readonly prismaService: PrismaService) {}

  async reserve(input: {
    subjectKey: string;
    userId?: string;
    requestKey: string;
    mode: AiGenerationMode;
    operation: AiGenerationOperation;
    limit: number;
  }) {
    const periodStart = new Date();
    periodStart.setUTCHours(0, 0, 0, 0);
    try {
      return await this.prismaService.$transaction(async (transaction) => {
        const existing = await transaction.aiUsageEvent.findUnique({
          where: { requestKey: input.requestKey },
        });
        if (existing) return { event: existing, reused: true };

        const bucket = await transaction.aiQuotaBucket.upsert({
          where: {
            subjectKey_periodStart: {
              subjectKey: input.subjectKey,
              periodStart,
            },
          },
          create: { subjectKey: input.subjectKey, periodStart },
          update: {},
        });
        const updated = await transaction.aiQuotaBucket.updateMany({
          where: {
            id: bucket.id,
            ...(input.mode === AiGenerationMode.PUBLIC
              ? { publicUsed: { lt: input.limit } }
              : { internalUsed: { lt: input.limit } }),
          },
          data:
            input.mode === AiGenerationMode.PUBLIC
              ? { publicUsed: { increment: 1 } }
              : { internalUsed: { increment: 1 } },
        });
        if (updated.count !== 1)
          throw new HttpException(
            'AI generation limit reached',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        const event = await transaction.aiUsageEvent.create({
          data: {
            userId: input.userId,
            subjectKey: input.subjectKey,
            requestKey: input.requestKey,
            mode: input.mode,
            operation: input.operation,
            status: AiGenerationStatus.REQUESTED,
          },
        });
        return { event, reused: false };
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prismaService.aiUsageEvent.findUnique({
          where: { requestKey: input.requestKey },
        });
        if (existing) return { event: existing, reused: true };
      }
      throw error;
    }
  }

  async complete(
    eventId: string,
    status: AiGenerationStatus,
    generationId?: string,
  ) {
    return this.prismaService.aiUsageEvent.update({
      where: { id: eventId },
      data: { status, generationId },
    });
  }
}
