import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserStatus } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { compare, hash } from 'bcryptjs';

import { RedisService } from '../common/redis.service';
import { TooManyRequestsException } from '../../common/exceptions/too-many-requests.exception';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthSession, AuthenticatedUser } from './auth.types';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_SECONDS = 15 * 60;

@Injectable()
export class AuthService {
  private readonly localLoginFailures = new Map<
    string,
    { count: number; expiresAt: number }
  >();

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async register(input: RegisterDto) {
    const email = this.normalizeEmail(input.email);
    const username = this.normalizeUsername(input.username);
    const passwordHash = await hash(input.password, 12);

    try {
      const user = await this.prismaService.$transaction(
        async (transaction) => {
          const createdUser = await transaction.user.create({
            data: {
              email,
              username,
              passwordHash,
              profile: { create: {} },
            },
            select: this.authUserSelect,
          });

          return createdUser;
        },
      );

      return this.issueSession(this.toAuthenticatedUser(user));
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email or username is already registered');
      }

      throw error;
    }
  }

  async login(input: LoginDto, ipAddress: string) {
    const email = this.normalizeEmail(input.email);
    const throttleKey = this.loginThrottleKey(email, ipAddress);
    await this.assertLoginAllowed(throttleKey);

    const user = await this.prismaService.user.findUnique({
      where: { email },
      select: this.authUserSelectWithPassword,
    });
    const passwordMatches = user?.passwordHash
      ? await compare(input.password, user.passwordHash)
      : false;

    if (!user || user.status !== UserStatus.ACTIVE || !passwordMatches) {
      await this.recordLoginFailure(throttleKey);
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.clearLoginFailures(throttleKey);
    return this.issueSession(this.toAuthenticatedUser(user));
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const existingToken = await this.prismaService.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { select: this.authUserSelect } },
    });
    const now = new Date();

    if (
      !existingToken ||
      existingToken.revokedAt ||
      existingToken.expiresAt <= now ||
      existingToken.user.status !== UserStatus.ACTIVE
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return this.prismaService.$transaction(async (transaction) => {
      const revoked = await transaction.refreshToken.updateMany({
        where: { id: existingToken.id, revokedAt: null },
        data: { revokedAt: now },
      });

      if (revoked.count !== 1) {
        throw new UnauthorizedException('Refresh token has already been used');
      }

      return this.issueSession(
        this.toAuthenticatedUser(existingToken.user),
        transaction,
      );
    });
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      return;
    }

    await this.prismaService.refreshToken.updateMany({
      where: {
        tokenHash: this.hashRefreshToken(refreshToken),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  async getCurrentUser(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: this.authUserSelect,
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.toAuthenticatedUser(user);
  }

  private async issueSession(
    user: AuthenticatedUser,
    database: PrismaService | Prisma.TransactionClient = this.prismaService,
  ): Promise<AuthSession> {
    const refreshToken = randomBytes(48).toString('base64url');
    const refreshExpiresAt = new Date(
      Date.now() + this.refreshTtlSeconds * 1000,
    );

    await database.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: refreshExpiresAt,
      },
    });

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
      username: user.username,
    });

    return { accessToken, refreshToken, refreshExpiresAt, user };
  }

  private async assertLoginAllowed(key: string) {
    try {
      const count = await this.redisService.increment(
        key,
        LOGIN_WINDOW_SECONDS,
      );

      if (count > LOGIN_LIMIT) {
        throw new TooManyRequestsException(
          'Too many login attempts. Try again later.',
        );
      }
    } catch (error: unknown) {
      if (error instanceof TooManyRequestsException) {
        throw error;
      }

      const current = this.localLoginFailures.get(key);
      const now = Date.now();
      const next =
        current && current.expiresAt > now
          ? { count: current.count + 1, expiresAt: current.expiresAt }
          : { count: 1, expiresAt: now + LOGIN_WINDOW_SECONDS * 1000 };
      this.localLoginFailures.set(key, next);

      if (next.count > LOGIN_LIMIT) {
        throw new TooManyRequestsException(
          'Too many login attempts. Try again later.',
        );
      }
    }
  }

  private async recordLoginFailure(key: string) {
    if (!this.localLoginFailures.has(key)) {
      this.localLoginFailures.set(key, {
        count: 1,
        expiresAt: Date.now() + LOGIN_WINDOW_SECONDS * 1000,
      });
    }
  }

  private async clearLoginFailures(key: string) {
    this.localLoginFailures.delete(key);
    try {
      await this.redisService.delete(key);
    } catch {
      // Redis is optional for local development; the in-memory fallback is cleared above.
    }
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private normalizeUsername(username: string) {
    return username.trim().toLowerCase();
  }

  private loginThrottleKey(email: string, ipAddress: string) {
    return `auth:login:${createHash('sha256')
      .update(`${email}:${ipAddress}`)
      .digest('hex')}`;
  }

  private hashRefreshToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private toAuthenticatedUser(user: {
    id: string;
    email: string;
    username: string;
    role: AuthenticatedUser['role'];
  }): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };
  }

  private get refreshTtlSeconds() {
    return this.configService.get<number>('JWT_REFRESH_TTL_SECONDS', 604800);
  }

  private readonly authUserSelect = {
    id: true,
    email: true,
    username: true,
    role: true,
    status: true,
  } as const;

  private readonly authUserSelectWithPassword = {
    ...this.authUserSelect,
    passwordHash: true,
  } as const;
}
