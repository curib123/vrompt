import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditActionType, AuditTargetType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type SettingValue = string | boolean | number;
type Definition = {
  defaultValue: SettingValue;
  group: string;
  isPublic: boolean;
  label: string;
  description: string;
  type: 'string' | 'boolean' | 'number';
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
};

export const SETTING_DEFINITIONS: Record<string, Definition> = {
  'branding.siteName': {
    defaultValue: 'Vrompt',
    group: 'Branding',
    isPublic: true,
    label: 'Site name',
    description: 'Name displayed across public navigation.',
    type: 'string',
    maxLength: 40,
  },
  'branding.tagline': {
    defaultValue: 'Find AI Prompts That Work. Save Them. Make Them Better.',
    group: 'Branding',
    isPublic: true,
    label: 'Tagline',
    description: 'Primary public-facing product message.',
    type: 'string',
    maxLength: 160,
  },
  'content.announcement': {
    defaultValue: '',
    group: 'Content',
    isPublic: true,
    label: 'Announcement',
    description: 'Optional message shown above public content.',
    type: 'string',
    maxLength: 240,
  },
  'features.registrationEnabled': {
    defaultValue: true,
    group: 'Features',
    isPublic: true,
    label: 'Creator registration',
    description: 'Allow new OAuth creator accounts.',
    type: 'boolean',
  },
  'features.showCommunityStats': {
    defaultValue: true,
    group: 'Features',
    isPublic: true,
    label: 'Community statistics',
    description: 'Show community totals on the landing page.',
    type: 'boolean',
  },
  'features.showRecommendations': {
    defaultValue: true,
    group: 'Features',
    isPublic: true,
    label: 'Personal recommendations',
    description: 'Show personalized recommendations in Explore.',
    type: 'boolean',
  },
  'moderation.requireReasons': {
    defaultValue: true,
    group: 'Moderation',
    isPublic: false,
    label: 'Require moderation reasons',
    description: 'Require staff to explain destructive moderation actions.',
    type: 'boolean',
  },
  'privacy.analyticsEnabled': {
    defaultValue: true,
    group: 'Privacy',
    isPublic: true,
    label: 'Privacy-safe analytics',
    description: 'Collect allowlisted aggregate product events.',
    type: 'boolean',
  },
  'privacy.retentionDays': {
    defaultValue: 365,
    group: 'Privacy',
    isPublic: false,
    label: 'Analytics retention',
    description: 'Desired aggregate analytics retention period in days.',
    type: 'number',
  },
  'features.aiGenerationEnabled': {
    defaultValue: true,
    group: 'AI limits',
    isPublic: false,
    label: 'AI generation enabled',
    description: 'Emergency switch for public and internal AI generation.',
    type: 'boolean',
  },
  'limits.aiFreeDaily': {
    defaultValue: 10,
    group: 'AI limits',
    isPublic: false,
    label: 'Free daily AI generations',
    description:
      'Maximum public AI generations available to free members per UTC day.',
    type: 'number',
  },
  'limits.aiProDaily': {
    defaultValue: 100,
    group: 'AI limits',
    isPublic: false,
    label: 'Pro daily AI generations',
    description:
      'Maximum public AI generations available to Pro members per UTC day.',
    type: 'number',
  },
  'limits.aiInternalDaily': {
    defaultValue: 50,
    group: 'AI limits',
    isPublic: false,
    label: 'Internal daily AI generations',
    description: 'Maximum internal/admin AI generations per UTC day.',
    type: 'number',
  },
  'limits.aiConcurrency': {
    defaultValue: 2,
    group: 'AI limits',
    isPublic: false,
    label: 'AI concurrency per member',
    description:
      'Maximum concurrent provider requests for one member or guest key.',
    type: 'number',
  },
  'limits.aiRatePerMinute': {
    defaultValue: 5,
    group: 'AI limits',
    isPublic: false,
    label: 'AI requests per minute',
    description: 'Short-window request cap per member or guest key.',
    type: 'number',
  },
  'limits.aiMaxInputChars': {
    defaultValue: 4000,
    group: 'AI limits',
    isPublic: false,
    label: 'AI input character limit',
    description: 'Maximum goal length accepted by the generator.',
    type: 'number',
    maxValue: 100000,
  },
  'billing.proPriceCentavos': {
    defaultValue: 29900,
    group: 'Billing',
    isPublic: false,
    label: 'Pro price in centavos',
    description:
      'Trusted PHP amount sent to PayMongo for one Pro access period.',
    type: 'number',
    maxValue: 10000000,
  },
  'billing.proPeriodDays': {
    defaultValue: 30,
    group: 'Billing',
    isPublic: false,
    label: 'Pro access period in days',
    description: 'Length of access granted after a verified payment.',
    type: 'number',
    maxValue: 366,
  },
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async publicSettings() {
    return this.values(true);
  }

  async getNumber(key: string, fallback: number) {
    const setting = await this.prisma.siteSetting.findUnique({
      where: { key },
      select: { value: true },
    });
    return typeof setting?.value === 'number' && Number.isFinite(setting.value)
      ? setting.value
      : fallback;
  }

  async getBoolean(key: string, fallback: boolean) {
    const setting = await this.prisma.siteSetting.findUnique({
      where: { key },
      select: { value: true },
    });
    return typeof setting?.value === 'boolean' ? setting.value : fallback;
  }
  async adminSettings() {
    const stored = await this.prisma.siteSetting.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });
    const byKey = new Map(stored.map((item) => [item.key, item]));
    return Object.entries(SETTING_DEFINITIONS).map(([key, definition]) => ({
      key,
      ...definition,
      value:
        (byKey.get(key)?.value as SettingValue | undefined) ??
        definition.defaultValue,
      updatedAt: byKey.get(key)?.updatedAt ?? null,
    }));
  }

  async update(actorId: string, key: string, value: unknown) {
    const definition = SETTING_DEFINITIONS[key];
    if (!definition) throw new NotFoundException('Setting not found');
    const normalized = this.validate(definition, value);
    const setting = await this.prisma.siteSetting.upsert({
      where: { key },
      create: {
        key,
        value: normalized,
        group: definition.group,
        isPublic: definition.isPublic,
        updatedById: actorId,
      },
      update: { value: normalized, updatedById: actorId },
      select: { id: true, key: true, value: true, updatedAt: true },
    });
    await this.audit(actorId, AuditActionType.SETTING_UPDATED, key);
    return setting;
  }

  async reset(actorId: string, key: string) {
    if (!SETTING_DEFINITIONS[key])
      throw new NotFoundException('Setting not found');
    await this.prisma.siteSetting.deleteMany({ where: { key } });
    await this.audit(actorId, AuditActionType.SETTING_RESET, key);
    return { key, value: SETTING_DEFINITIONS[key].defaultValue };
  }

  async purgeExpiredAnalytics(actorId: string) {
    const stored = await this.prisma.siteSetting.findUnique({
      where: { key: 'privacy.retentionDays' },
      select: { value: true },
    });
    const configured = stored?.value;
    const retentionDays =
      typeof configured === 'number'
        ? configured
        : Number(SETTING_DEFINITIONS['privacy.retentionDays']!.defaultValue);
    const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
    const result = await this.prisma.analyticsEvent.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: AuditActionType.SETTING_UPDATED,
        targetType: AuditTargetType.SETTING,
        metadata: {
          key: 'privacy.retentionDays',
          operation: 'analytics_retention_purge',
          retentionDays,
          deletedCount: result.count,
        },
      },
    });
    return { retentionDays, cutoff, deletedCount: result.count };
  }

  private async values(publicOnly: boolean) {
    const definitions = Object.entries(SETTING_DEFINITIONS).filter(
      ([, item]) => !publicOnly || item.isPublic,
    );
    const stored = await this.prisma.siteSetting.findMany({
      where: publicOnly ? { isPublic: true } : undefined,
    });
    const byKey = new Map(
      stored.map((item) => [item.key, item.value as SettingValue]),
    );
    return Object.fromEntries(
      definitions.map(([key, item]) => [
        key,
        byKey.get(key) ?? item.defaultValue,
      ]),
    );
  }

  private validate(
    definition: Definition,
    value: unknown,
  ): Prisma.InputJsonValue {
    if (typeof value !== definition.type)
      throw new BadRequestException(`Value must be ${definition.type}`);
    if (typeof value === 'string')
      return value.trim().slice(0, definition.maxLength ?? 500);
    if (
      typeof value === 'number' &&
      (!Number.isFinite(value) ||
        value < (definition.minValue ?? 1) ||
        value > (definition.maxValue ?? 3650))
    )
      throw new BadRequestException('Number is outside the allowed range');
    return value as boolean | number;
  }

  private audit(actorId: string, action: AuditActionType, key: string) {
    return this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        targetType: AuditTargetType.SETTING,
        metadata: { key },
      },
    });
  }
}
