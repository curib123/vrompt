import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'node:net';
import {
  AccountType,
  AuditActionType,
  AuditTargetType,
  Prisma,
  UserRole,
  UserStatus,
} from '@prisma/client';

import { AuthService } from '../auth/auth.service';
import { MetricsService } from '../common/metrics.service';
import { RedisService } from '../common/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AdminUserQueryDto } from './dto/admin-user-query.dto';
import type { CreateStaffUserDto } from './dto/create-staff-user.dto';
import type { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
    private readonly redis: RedisService,
  ) {}

  async dashboard() {
    const [users, prompts, reports, comments, collections, staff] =
      await Promise.all([
        this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
        this.prisma.promptRepository.count(),
        this.prisma.report.count({ where: { status: 'OPEN' } }),
        this.prisma.comment.count(),
        this.prisma.collection.count(),
        this.prisma.user.count({
          where: { role: { in: [UserRole.ADMIN, UserRole.MODERATOR] } },
        }),
      ]);
    return {
      users,
      prompts,
      openReports: reports,
      comments,
      collections,
      staff,
    };
  }

  async system() {
    const [database, cache, oracleServer, domain] = await Promise.allSettled([
      this.checkDependency(() => this.prisma.$queryRaw`SELECT 1`),
      this.checkDependency(() => this.redis.ping()),
      this.checkOracleServer(),
      this.checkDomain(),
    ] as const);
    const storageDriver = this.config.get<string>(
      'MEDIA_STORAGE_DRIVER',
      'local',
    );
    return {
      checkedAt: new Date().toISOString(),
      environment: this.config.get<string>('NODE_ENV', 'development'),
      runtime: process.version,
      uptimeSeconds: Math.round(process.uptime()),
      dependencies: {
        database: {
          status:
            database.status === 'fulfilled'
              ? database.value.status
              : ('down' as const),
          latencyMs:
            database.status === 'fulfilled' ? database.value.latencyMs : null,
        },
        redis:
          cache.status === 'fulfilled'
            ? cache.value
            : { status: 'down' as const, latencyMs: null },
        oracleServer:
          oracleServer.status === 'fulfilled'
            ? oracleServer.value
            : { status: 'down' as const, latencyMs: null },
        domain:
          domain.status === 'fulfilled'
            ? domain.value
            : { status: 'down' as const, latencyMs: null },
      },
      integrations: {
        googleOAuth: Boolean(this.config.get<string>('GOOGLE_CLIENT_ID', '')),
        githubOAuth: Boolean(this.config.get<string>('GITHUB_CLIENT_ID', '')),
        cloudStorage:
          storageDriver === 'cloudinary',
        storageDriver,
        aiProvider: Boolean(this.config.get<string>('AI_API_KEY', '').trim()),
        payMongo: Boolean(
          this.config.get<string>('PAYMONGO_SECRET_KEY', '').trim() &&
            this.config.get<string>('PAYMONGO_WEBHOOK_SECRET', '').trim(),
        ),
      },
      metrics: this.metrics.getSnapshot(),
    };
  }

  private async checkDependency(check: () => Promise<unknown>) {
    const startedAt = Date.now();
    try {
      await check();
      return { status: 'up' as const, latencyMs: Date.now() - startedAt };
    } catch {
      return { status: 'down' as const, latencyMs: Date.now() - startedAt };
    }
  }

  private checkOracleServer() {
    const host = this.config.get<string>('ORACLE_HOST', '').trim();
    if (!host) {
      return Promise.resolve({
        status: 'not_configured' as const,
        latencyMs: null,
      });
    }

    const port = this.config.get<number>('ORACLE_PORT', 22);
    const startedAt = Date.now();
    return new Promise<{
      status: 'up' | 'down';
      latencyMs: number;
    }>((resolve) => {
      const socket = new Socket();
      let completed = false;
      const finish = (status: 'up' | 'down') => {
        if (completed) return;
        completed = true;
        socket.destroy();
        resolve({ status, latencyMs: Date.now() - startedAt });
      };
      socket.setTimeout(3_000);
      socket.once('connect', () => finish('up'));
      socket.once('timeout', () => finish('down'));
      socket.once('error', () => finish('down'));
      socket.connect(port, host);
    });
  }

  private async checkDomain() {
    const configuredUrl = this.config
      .get<string>('VROMPT_PUBLIC_URL', '')
      .trim();
    const domain = this.config.get<string>('VROMPT_DOMAIN', '').trim();
    if (!configuredUrl && !domain) {
      return { status: 'not_configured' as const, latencyMs: null };
    }

    const baseUrl = configuredUrl || `https://${domain}`;
    const startedAt = Date.now();
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/health`, {
        signal: AbortSignal.timeout(5_000),
      });
      return {
        status: response.ok ? ('up' as const) : ('down' as const),
        latencyMs: Date.now() - startedAt,
      };
    } catch {
      return { status: 'down' as const, latencyMs: Date.now() - startedAt };
    }
  }

  async list(input: AdminUserQueryDto) {
    const page = Math.max(Number(input.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(input.pageSize) || 25, 1), 100);
    const q = input.q?.trim();
    const where: Prisma.UserWhereInput = {
      ...(input.role ? { role: input.role } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { username: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: this.userSelect,
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items,
      page,
      pageSize,
      total,
      hasNextPage: page * pageSize < total,
    };
  }

  async createStaff(actorId: string, input: CreateStaffUserDto) {
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim().toLowerCase();
    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          username,
          role: input.role,
          status: UserStatus.ACTIVE,
          accountType: AccountType.OFFICIAL,
          onboardingCompleted: true,
          profile: { create: { displayName: username } },
        },
        select: this.userSelect,
      });
      await this.auth.setStaffPassword(user.id, input.password);
      await this.audit(actorId, user.id, { created: true, role: input.role });
      return user;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('Email or username already exists');
      throw error;
    }
  }

  async update(actorId: string, userId: string, input: UpdateAdminUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!existing) throw new NotFoundException('User not found');
    if (
      actorId === userId &&
      (input.status === 'SUSPENDED' || (input.role && input.role !== 'ADMIN'))
    )
      throw new ForbiddenException(
        'You cannot remove your own administrator access',
      );
    if (!input.role && !input.status && !input.password)
      throw new BadRequestException('No changes provided');
    const resultingRole = input.role ?? existing.role;
    if (
      input.password &&
      resultingRole !== UserRole.ADMIN &&
      resultingRole !== UserRole.MODERATOR
    )
      throw new BadRequestException(
        'Passwords are only available for staff accounts',
      );
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.role ? { role: input.role } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      select: this.userSelect,
    });
    if (input.password) {
      await this.auth.setStaffPassword(userId, input.password);
    }
    if (input.role && input.role === UserRole.USER)
      await this.prisma.staffCredential.deleteMany({ where: { userId } });
    await this.audit(actorId, userId, {
      fromRole: existing.role,
      role: user.role,
      status: user.status,
      passwordChanged: Boolean(input.password),
    });
    return user;
  }

  private audit(
    actorId: string,
    targetId: string,
    metadata: Prisma.InputJsonValue,
  ) {
    return this.prisma.auditLog.create({
      data: {
        actorId,
        action: AuditActionType.ROLE_CHANGED,
        targetType: AuditTargetType.ROLE,
        targetId,
        metadata,
      },
    });
  }

  private readonly userSelect = {
    id: true,
    email: true,
    username: true,
    role: true,
    status: true,
    accountType: true,
    createdAt: true,
    staffCredential: { select: { lastLoginAt: true } },
  } as const;
}
