import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserStatus } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { createHash, randomBytes } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis.service';
import { TooManyRequestsException } from '../../common/exceptions/too-many-requests.exception';
import type { AuthSession, AuthenticatedUser } from './auth.types';

export interface GoogleIdentity {
  avatar?: string;
  displayName?: string;
  email: string;
  subject: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async assertAuthRateLimit(key: string, limit: number, ttlSeconds: number) {
    try {
      const count = await this.redisService.increment(
        `auth:${key}`,
        ttlSeconds,
      );
      if (count > limit) {
        throw new TooManyRequestsException(
          'Too many authentication attempts. Try again later.',
        );
      }
    } catch (error: unknown) {
      if (error instanceof TooManyRequestsException) {
        throw error;
      }

      // Redis is an optional local-development dependency; auth remains available if it is down.
    }
  }

  getGoogleAuthorizationUrl(state: string) {
    const client = this.googleClient();

    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'select_account',
      scope: ['openid', 'email', 'profile'],
      state,
    });
  }

  async exchangeGoogleCode(code: string) {
    const client = this.googleClient();
    const { tokens } = await client.getToken(code);

    if (!tokens.id_token) {
      throw new UnauthorizedException(
        'Google did not return an identity token',
      );
    }

    const ticket = await client.verifyIdToken({
      audience: this.googleClientId,
      idToken: tokens.id_token,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      throw new UnauthorizedException(
        'Google account email could not be verified',
      );
    }

    return this.authenticateGoogle({
      avatar: payload.picture,
      displayName: payload.name,
      email: payload.email,
      subject: payload.sub,
    });
  }

  async authenticateGoogle(identity: GoogleIdentity) {
    const email = this.normalizeEmail(identity.email);
    const user = await this.prismaService.$transaction(async (transaction) => {
      let existingUser = await transaction.user.findUnique({
        where: { googleId: identity.subject },
        select: this.authUserSelect,
      });

      if (!existingUser) {
        existingUser = await transaction.user.findUnique({
          where: { email },
          select: this.authUserSelect,
        });
      }

      if (existingUser && existingUser.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('This account is unavailable');
      }

      if (existingUser) {
        const updatedUser = await transaction.user.update({
          where: { id: existingUser.id },
          data: { email, googleId: identity.subject },
          select: this.authUserSelect,
        });

        await transaction.profile.upsert({
          where: { userId: existingUser.id },
          create: {
            userId: existingUser.id,
            avatar: identity.avatar,
            displayName: identity.displayName,
          },
          // Google supplies defaults on first sign-in; user-managed profile data persists.
          update: {},
        });

        return updatedUser;
      }

      const username = await this.uniqueUsername(
        transaction,
        identity.displayName || email.split('@')[0] || 'creator',
        identity.subject,
      );

      return transaction.user.create({
        data: {
          email,
          googleId: identity.subject,
          username,
          profile: {
            create: {
              avatar: identity.avatar,
              displayName: identity.displayName,
            },
          },
        },
        select: this.authUserSelect,
      });
    });

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

  private async uniqueUsername(
    database: Prisma.TransactionClient,
    source: string,
    subject: string,
  ) {
    const base =
      source
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 25) || 'creator';
    const suffix = createHash('sha256')
      .update(subject)
      .digest('hex')
      .slice(0, 6);
    const candidates = [
      base,
      `${base.slice(0, 25 - suffix.length - 1)}_${suffix}`,
    ];

    for (const candidate of candidates) {
      const existing = await database.user.findUnique({
        where: { username: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }
    }

    return `creator_${suffix}`;
  }

  private googleClient() {
    if (!this.googleClientId || !this.googleClientSecret) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured. Add Google OAuth credentials.',
      );
    }

    return new OAuth2Client(
      this.googleClientId,
      this.googleClientSecret,
      this.googleCallbackUrl,
    );
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
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

  private get googleClientId() {
    return this.configService.get<string>('GOOGLE_CLIENT_ID', '');
  }

  private get googleClientSecret() {
    return this.configService.get<string>('GOOGLE_CLIENT_SECRET', '');
  }

  private get googleCallbackUrl() {
    return this.configService.get<string>(
      'GOOGLE_CALLBACK_URL',
      'http://localhost:4000/api/v1/auth/google/callback',
    );
  }

  private get refreshTtlSeconds() {
    return this.configService.get<number>('JWT_REFRESH_TTL_SECONDS', 604800);
  }

  private readonly authUserSelect = {
    id: true,
    email: true,
    username: true,
    googleId: true,
    role: true,
    status: true,
  } as const;
}
