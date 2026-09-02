import { Injectable } from '@nestjs/common';
import { AccountType } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import type { AnalyticsSummaryQueryDto } from './dto/analytics-summary-query.dto';
import type {
  AnalyticsEventName,
  TrackAnalyticsEventDto,
} from './dto/track-analytics-event.dto';

const SAFE_METADATA_KEYS = new Set([
  'deviceClass',
  'hasEvidence',
  'journeyId',
  'platform',
  'promptId',
  'resultCount',
  'source',
]);

@Injectable()
export class AnalyticsService {
  constructor(private readonly prismaService: PrismaService) {}

  async track(input: TrackAnalyticsEventDto, actor?: AuthenticatedUser) {
    return this.prismaService.analyticsEvent.create({
      data: {
        name: input.name,
        actorId: actor?.id,
        accountType: actor?.accountType,
        metadata: this.sanitizeMetadata(input.metadata),
      },
      select: { id: true },
    });
  }

  async summary(input: AnalyticsSummaryQueryDto) {
    const from = input.from ? new Date(input.from) : undefined;
    const to = input.to ? new Date(input.to) : undefined;
    const where = {
      OR: [
        { accountType: { notIn: [AccountType.STARTER, AccountType.OFFICIAL] } },
        { accountType: null },
      ],
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };
    const grouped = await this.prismaService.analyticsEvent.groupBy({
      by: ['name'],
      where,
      _count: { _all: true },
      orderBy: { _count: { name: 'desc' } },
    });
    const evidence = await this.prismaService.analyticsEvent.groupBy({
      by: ['name'],
      where: {
        ...where,
        name: { in: ['repository_viewed', 'evidence_viewed'] },
      },
      _count: { _all: true },
    });

    return {
      generatedAt: new Date().toISOString(),
      accountTypesIncluded: ['REAL', 'ANONYMOUS'],
      events: grouped.map((event) => ({
        name: event.name as AnalyticsEventName,
        count: event._count._all,
      })),
      evidenceFunnel: evidence.map((event) => ({
        name: event.name as AnalyticsEventName,
        count: event._count._all,
      })),
    };
  }

  private sanitizeMetadata(metadata?: Record<string, unknown>) {
    if (!metadata) {
      return undefined;
    }

    const safeEntries = Object.entries(metadata)
      .filter(([key]) => SAFE_METADATA_KEYS.has(key))
      .map(([key, value]) => {
        if (
          typeof value !== 'string' &&
          typeof value !== 'number' &&
          typeof value !== 'boolean'
        ) {
          return null;
        }

        return [key, this.limitValue(value)] as const;
      })
      .filter(
        (entry): entry is readonly [string, string | number | boolean] =>
          entry !== null,
      )
      .slice(0, 4);

    return Object.fromEntries(safeEntries);
  }

  private limitValue(value: string | number | boolean) {
    return typeof value === 'string' ? value.slice(0, 40) : value;
  }
}
