import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditActionType, AuditTargetType, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type { CreateAudienceDto } from './dto/create-audience.dto';
import type { UpdateAudienceDto } from './dto/update-audience.dto';

const audienceSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  isActive: true,
  sortOrder: true,
} as const;

const adminAudienceSelect = {
  ...audienceSelect,
  _count: { select: { promptAudiences: true, userAudiences: true } },
} as const;

@Injectable()
export class AudiencesService {
  constructor(private readonly prismaService: PrismaService) {}

  listActive() {
    return this.prismaService.audience.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: audienceSelect,
    });
  }

  async getBySlug(slug: string) {
    const audience = await this.prismaService.audience.findFirst({
      where: { slug: slug.trim().toLowerCase(), isActive: true },
      select: {
        ...audienceSelect,
        _count: { select: { promptAudiences: true, userAudiences: true } },
      },
    });

    if (!audience) {
      throw new NotFoundException('Audience not found');
    }

    return audience;
  }

  async getUserAudiences(userId: string) {
    const [user, options] = await Promise.all([
      this.prismaService.user.findUnique({
        where: { id: userId },
        select: {
          onboardingCompleted: true,
          audienceInterests: {
            orderBy: { audience: { sortOrder: 'asc' } },
            select: { audience: { select: audienceSelect } },
          },
        },
      }),
      this.listActive(),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      onboardingCompleted: user.onboardingCompleted,
      selected: user.audienceInterests.map(({ audience }) => audience),
      options,
    };
  }

  async updateUserAudiences(userId: string, audienceIds: string[]) {
    const ids = [...new Set(audienceIds)];
    if (ids.length < 1 || ids.length > 5) {
      throw new BadRequestException(
        'Choose between 1 and 5 audience interests',
      );
    }

    const activeAudiences = await this.prismaService.audience.findMany({
      where: { id: { in: ids }, isActive: true },
      select: { id: true },
    });
    if (activeAudiences.length !== ids.length) {
      throw new BadRequestException(
        'Audience interests must be active options',
      );
    }

    await this.prismaService.$transaction(async (transaction) => {
      await transaction.userAudience.deleteMany({ where: { userId } });
      await transaction.userAudience.createMany({
        data: ids.map((audienceId) => ({ userId, audienceId })),
      });
      await transaction.user.update({
        where: { id: userId },
        data: { onboardingCompleted: true },
      });
    });

    return this.getUserAudiences(userId);
  }

  async validateActiveIds(audienceIds: string[] | undefined) {
    const ids = [...new Set(audienceIds ?? [])];
    if (ids.length > 5) {
      throw new BadRequestException('A prompt can target at most 5 audiences');
    }
    if (ids.length === 0) {
      return [];
    }

    const audiences = await this.prismaService.audience.findMany({
      where: { id: { in: ids }, isActive: true },
      select: audienceSelect,
    });
    if (audiences.length !== ids.length) {
      throw new BadRequestException('Prompt audiences must be active options');
    }

    return ids.map((id) => audiences.find((audience) => audience.id === id)!);
  }

  async adminList() {
    return this.prismaService.audience.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: adminAudienceSelect,
    });
  }

  async create(actorId: string, input: CreateAudienceDto) {
    const name = input.name.trim();
    const slug = this.slugify(name);

    try {
      const audience = await this.prismaService.audience.create({
        data: {
          name,
          slug,
          description: this.cleanNullable(input.description),
          isActive: input.isActive ?? true,
          sortOrder: input.sortOrder ?? 0,
        },
        select: adminAudienceSelect,
      });
      await this.audit(actorId, AuditActionType.AUDIENCE_CREATED, audience.id, {
        name: audience.name,
      });
      return audience;
    } catch (error: unknown) {
      this.rethrowConflict(error);
    }
  }

  async update(actorId: string, id: string, input: UpdateAudienceDto) {
    const existing = await this.prismaService.audience.findUnique({
      where: { id },
      select: { id: true, isActive: true, sortOrder: true },
    });
    if (!existing) {
      throw new NotFoundException('Audience not found');
    }

    const nextActive = input.isActive ?? existing.isActive;
    const action =
      input.isActive !== undefined && input.isActive !== existing.isActive
        ? nextActive
          ? AuditActionType.AUDIENCE_ACTIVATED
          : AuditActionType.AUDIENCE_DEACTIVATED
        : input.sortOrder !== undefined &&
            input.sortOrder !== existing.sortOrder
          ? AuditActionType.AUDIENCE_REORDERED
          : AuditActionType.AUDIENCE_UPDATED;

    try {
      const audience = await this.prismaService.audience.update({
        where: { id },
        data: {
          ...(input.name !== undefined
            ? { name: input.name.trim(), slug: this.slugify(input.name) }
            : {}),
          ...(input.description !== undefined
            ? { description: this.cleanNullable(input.description) }
            : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.sortOrder !== undefined
            ? { sortOrder: input.sortOrder }
            : {}),
        },
        select: adminAudienceSelect,
      });
      await this.audit(actorId, action, audience.id, {
        name: audience.name,
        isActive: audience.isActive,
        sortOrder: audience.sortOrder,
      });
      return audience;
    } catch (error: unknown) {
      this.rethrowConflict(error);
    }
  }

  private async audit(
    actorId: string,
    action: AuditActionType,
    targetId: string,
    metadata: Prisma.InputJsonValue,
  ) {
    await this.prismaService.auditLog.create({
      data: {
        actorId,
        action,
        targetType: AuditTargetType.AUDIENCE,
        targetId,
        metadata,
      },
    });
  }

  private rethrowConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('An audience with that name already exists');
    }
    throw error;
  }

  private slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private cleanNullable(value: string | null | undefined) {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed || null;
  }
}
