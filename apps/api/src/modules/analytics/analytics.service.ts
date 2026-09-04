import { Injectable } from '@nestjs/common';
import { AccountType, Prisma } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import type { AnalyticsSummaryQueryDto } from './dto/analytics-summary-query.dto';
import type {
  AnalyticsEventName,
  TrackAnalyticsEventDto,
} from './dto/track-analytics-event.dto';

const SAFE_METADATA_KEYS = new Set([
  'deviceClass',
  'feature',
  'hasEvidence',
  'journeyId',
  'platform',
  'promptId',
  'resultCount',
  'source',
  'plan',
  'limit',
]);

@Injectable()
export class AnalyticsService {
  constructor(private readonly prismaService: PrismaService) {}

  async track(input: TrackAnalyticsEventDto, actor?: AuthenticatedUser) {
    const setting = await this.prismaService.siteSetting.findUnique({
      where: { key: 'privacy.analyticsEnabled' },
      select: { value: true },
    });
    if (setting?.value === false) return { accepted: false };
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
    let to = input.to ? new Date(input.to) : new Date();
    const preset = input.preset ?? (input.from ? 'custom' : 'month');
    const days = preset === 'week' ? 7 : preset === 'year' ? 365 : 30;
    let from = input.from
      ? new Date(input.from)
      : new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    if (from > to) [from, to] = [to, from];
    const where = {
      OR: [
        { accountType: { notIn: [AccountType.STARTER, AccountType.OFFICIAL] } },
        { accountType: null },
      ],
      createdAt: { gte: from, lte: to },
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
    const rangeDays = Math.max(
      1,
      Math.ceil((to.getTime() - from.getTime()) / 86_400_000),
    );
    const granularity =
      rangeDays > 120 ? 'month' : rangeDays > 31 ? 'week' : 'day';
    const trends = await this.prismaService.$queryRaw<
      Array<{ bucket: Date; name: string; count: bigint }>
    >(Prisma.sql`
      SELECT date_trunc(${granularity}, "createdAt") AS bucket, name, COUNT(*)::bigint AS count
      FROM "AnalyticsEvent"
      WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
        AND ("accountType" IS NULL OR "accountType"::text NOT IN ('STARTER', 'OFFICIAL'))
      GROUP BY bucket, name ORDER BY bucket ASC
    `);
    const acquisition = await this.prismaService.$queryRaw<
      Array<{ source: string | null; count: bigint }>
    >(Prisma.sql`
      SELECT COALESCE(metadata->>'source', 'unknown') AS source, COUNT(*)::bigint AS count
      FROM "AnalyticsEvent"
      WHERE name = 'landing_viewed' AND "createdAt" >= ${from} AND "createdAt" <= ${to}
        AND ("accountType" IS NULL OR "accountType"::text NOT IN ('STARTER', 'OFFICIAL'))
      GROUP BY source ORDER BY count DESC
    `);
    const sessions = await this.prismaService.$queryRaw<
      Array<{ count: bigint }>
    >(Prisma.sql`
      SELECT COUNT(DISTINCT metadata->>'journeyId')::bigint AS count
      FROM "AnalyticsEvent"
      WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
        AND metadata ? 'journeyId'
        AND ("accountType" IS NULL OR "accountType"::text NOT IN ('STARTER', 'OFFICIAL'))
    `);

    const activity = await this.prismaService.$queryRaw<
      Array<{ dau: bigint; wau: bigint; mau: bigint }>
    >(
      Prisma.sql`
        SELECT
          COUNT(DISTINCT CASE WHEN "createdAt" >= ${new Date(to.getTime() - 86_400_000)} THEN "actorId" END)::bigint AS dau,
          COUNT(DISTINCT CASE WHEN "createdAt" >= ${new Date(to.getTime() - 7 * 86_400_000)} THEN "actorId" END)::bigint AS wau,
          COUNT(DISTINCT CASE WHEN "createdAt" >= ${new Date(to.getTime() - 30 * 86_400_000)} THEN "actorId" END)::bigint AS mau
        FROM "AnalyticsEvent"
        WHERE "createdAt" <= ${to} AND "actorId" IS NOT NULL
          AND ("accountType" IS NULL OR "accountType"::text NOT IN ('STARTER', 'OFFICIAL'))
      `,
    );
    const activation = await this.prismaService.$queryRaw<
      Array<{ signed_up: bigint; activated: bigint }>
    >(
      Prisma.sql`
        WITH signups AS (
          SELECT "actorId", MIN("createdAt") AS signup_at
          FROM "AnalyticsEvent"
          WHERE name = 'auth_completed' AND "actorId" IS NOT NULL
            AND "createdAt" >= ${from} AND "createdAt" <= ${to}
          GROUP BY "actorId"
        )
        SELECT COUNT(*)::bigint AS signed_up,
          COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM "AnalyticsEvent" e
            WHERE e."actorId" = signups."actorId" AND e.name IN ('prompt_generated','prompt_saved','prompt_copied','prompt_reused')
              AND e."createdAt" > signups.signup_at AND e."createdAt" <= signups.signup_at + INTERVAL '7 days'
          ))::bigint AS activated
        FROM signups
      `,
    );
    const retention = await this.prismaService.$queryRaw<
      Array<{ cohort: bigint; retained: bigint }>
    >(
      Prisma.sql`
        WITH cohort AS (
          SELECT "actorId", MIN("createdAt") AS signup_at
          FROM "AnalyticsEvent"
          WHERE name = 'auth_completed' AND "actorId" IS NOT NULL
            AND "createdAt" >= ${from} AND "createdAt" <= ${to}
          GROUP BY "actorId"
        )
        SELECT COUNT(*)::bigint AS cohort,
          COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM "AnalyticsEvent" e
            WHERE e."actorId" = cohort."actorId" AND e."createdAt" >= cohort.signup_at + INTERVAL '7 days'
              AND e."createdAt" < cohort.signup_at + INTERVAL '14 days'
          ))::bigint AS retained
        FROM cohort
      `,
    );
    const publicPrompts = await this.prismaService.$queryRaw<
      Array<{ prompt_id: string; views: bigint; uses: bigint }>
    >(
      Prisma.sql`
        SELECT metadata->>'promptId' AS prompt_id,
          COUNT(*) FILTER (WHERE name = 'public_prompt_viewed')::bigint AS views,
          COUNT(*) FILTER (WHERE name = 'public_prompt_used')::bigint AS uses
        FROM "AnalyticsEvent"
        WHERE metadata ? 'promptId' AND name IN ('public_prompt_viewed','public_prompt_used')
          AND "createdAt" >= ${from} AND "createdAt" <= ${to}
        GROUP BY metadata->>'promptId' ORDER BY views DESC LIMIT 20
      `,
    );
    const monetization = await this.prismaService.$queryRaw<
      Array<{ started: bigint; canceled: bigint; revenue: bigint }>
    >(
      Prisma.sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'PAID')::bigint AS started,
          COUNT(*) FILTER (WHERE status IN ('CANCELLED','EXPIRED','REFUNDED'))::bigint AS canceled,
          COALESCE(SUM(amount) FILTER (WHERE status = 'PAID'), 0)::bigint AS revenue
        FROM "BillingPayment"
        WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
      `,
    );

    const counts = Object.fromEntries(
      grouped.map((item) => [item.name, item._count._all]),
    );
    const landingViews = counts.landing_viewed ?? 0;
    const signupStarts = counts.signup_started ?? 0;
    const completed = counts.auth_completed ?? 0;

    return {
      generatedAt: new Date().toISOString(),
      period: {
        preset,
        from: from.toISOString(),
        to: to.toISOString(),
        granularity,
      },
      accountTypesIncluded: ['REAL', 'ANONYMOUS'],
      overview: {
        totalEvents: grouped.reduce((sum, item) => sum + item._count._all, 0),
        sessions: Number(sessions[0]?.count ?? 0),
        landingViews,
        organicVisits: Number(
          acquisition.find((item) => item.source === 'organic')?.count ?? 0,
        ),
        returningUsers: counts.returning_user ?? 0,
        signupStarts,
        completedSignups: completed,
        signupConversionRate: signupStarts
          ? Math.round((completed / signupStarts) * 1000) / 10
          : 0,
        dau: Number(activity[0]?.dau ?? 0),
        wau: Number(activity[0]?.wau ?? 0),
        mau: Number(activity[0]?.mau ?? 0),
        activatedUsers: Number(activation[0]?.activated ?? 0),
        activationRate: Number(activation[0]?.signed_up ?? 0)
          ? Math.round(
              (Number(activation[0]?.activated ?? 0) /
                Number(activation[0]?.signed_up ?? 0)) *
                1000,
            ) / 10
          : 0,
        retention7DayRate: Number(retention[0]?.cohort ?? 0)
          ? Math.round(
              (Number(retention[0]?.retained ?? 0) /
                Number(retention[0]?.cohort ?? 0)) *
                1000,
            ) / 10
          : 0,
        promptReuses: counts.prompt_reused ?? 0,
        limitReached: counts.plan_limit_reached ?? 0,
      },
      events: grouped.map((event) => ({
        name: event.name as AnalyticsEventName,
        count: event._count._all,
      })),
      evidenceFunnel: evidence.map((event) => ({
        name: event.name as AnalyticsEventName,
        count: event._count._all,
      })),
      acquisition: acquisition.map((item) => ({
        source: item.source ?? 'unknown',
        count: Number(item.count),
      })),
      trends: trends.map((item) => ({
        bucket: item.bucket.toISOString(),
        name: item.name,
        count: Number(item.count),
      })),
      publicPrompts: publicPrompts.map((item) => ({
        promptId: item.prompt_id,
        views: Number(item.views),
        uses: Number(item.uses),
        useRate: Number(item.views)
          ? Math.round((Number(item.uses) / Number(item.views)) * 1000) / 10
          : 0,
      })),
      monetization: {
        subscriptionsStarted: Number(monetization[0]?.started ?? 0),
        subscriptionsCanceled: Number(monetization[0]?.canceled ?? 0),
        revenue: Number(monetization[0]?.revenue ?? 0),
      },
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
