import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuthProvider, Prisma, UserStatus } from '@prisma/client';
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

export interface GitHubIdentity {
  avatarUrl?: string;
  displayName?: string;
  email?: string;
  providerUsername?: string;
  subject: string;
}

interface VerifiedOAuthIdentity {
  avatarUrl?: string;
  displayName?: string;
  provider: OAuthProvider;
  providerEmail?: string;
  providerUsername?: string;
  providerUserId: string;
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

    return this.authenticateOAuth({
      avatarUrl: payload.picture,
      displayName: payload.name,
      provider: OAuthProvider.GOOGLE,
      providerEmail: payload.email,
      providerUserId: payload.sub,
    });
  }

  async authenticateGoogle(identity: GoogleIdentity) {
    return this.authenticateOAuth({
      avatarUrl: identity.avatar,
      displayName: identity.displayName,
      provider: OAuthProvider.GOOGLE,
      providerEmail: identity.email,
      providerUserId: identity.subject,
    });
  }

  getGitHubAuthorizationUrl(state: string) {
    this.githubClientConfig();
    const query = new URLSearchParams({
      client_id: this.githubClientId,
      redirect_uri: this.githubCallbackUrl,
      response_type: 'code',
      scope: 'read:user user:email',
      state,
    });
    return `https://github.com/login/oauth/authorize?${query.toString()}`;
  }

  async exchangeGitHubCode(code: string) {
    this.githubClientConfig();
    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        body: new URLSearchParams({
          client_id: this.githubClientId,
          client_secret: this.githubClientSecret,
          code,
          redirect_uri: this.githubCallbackUrl,
        }),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      },
    );
    const tokenBody = (await tokenResponse.json().catch(() => null)) as {
      access_token?: string;
    } | null;
    if (!tokenResponse.ok || !tokenBody?.access_token) {
      throw new UnauthorizedException(
        'GitHub authorization could not be completed',
      );
    }

    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${tokenBody.access_token}`,
      'User-Agent': 'Vrompt',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    const profileResponse = await fetch('https://api.github.com/user', {
      headers,
    });
    const profile = (await profileResponse.json().catch(() => null)) as {
      avatar_url?: string;
      id?: number;
      login?: string;
      name?: string | null;
      email?: string | null;
    } | null;
    if (!profileResponse.ok || !profile?.id || !profile.login) {
      throw new UnauthorizedException('GitHub identity could not be verified');
    }

    let email = profile.email ?? undefined;
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers,
      });
      const emails = (await emailsResponse.json().catch(() => null)) as Array<{
        email?: string;
        primary?: boolean;
        verified?: boolean;
      }> | null;
      if (emailsResponse.ok) {
        email =
          emails?.find((item) => item.primary && item.verified)?.email ??
          emails?.find((item) => item.verified)?.email;
      }
    }

    return this.authenticateOAuth({
      avatarUrl: profile.avatar_url,
      displayName: profile.name ?? profile.login,
      provider: OAuthProvider.GITHUB,
      providerEmail: email,
      providerUsername: profile.login,
      providerUserId: String(profile.id),
    });
  }

  async authenticateGitHub(identity: GitHubIdentity) {
    return this.authenticateOAuth({
      avatarUrl: identity.avatarUrl,
      displayName: identity.displayName,
      provider: OAuthProvider.GITHUB,
      providerEmail: identity.email,
      providerUsername: identity.providerUsername,
      providerUserId: identity.subject,
    });
  }

  private async authenticateOAuth(identity: VerifiedOAuthIdentity) {
    const providerEmail = identity.providerEmail
      ? this.normalizeEmail(identity.providerEmail)
      : undefined;
    const user = await this.prismaService.$transaction(async (transaction) => {
      const existingIdentity = await transaction.userIdentity.findUnique({
        where: {
          provider_providerUserId: {
            provider: identity.provider,
            providerUserId: identity.providerUserId,
          },
        },
        select: {
          id: true,
          user: { select: this.authUserSelect },
        },
      });

      if (
        existingIdentity?.user.status !== UserStatus.ACTIVE &&
        existingIdentity
      ) {
        throw new UnauthorizedException('This account is unavailable');
      }

      if (existingIdentity) {
        await transaction.userIdentity.update({
          where: { id: existingIdentity.id },
          data: {
            avatarUrl: identity.avatarUrl,
            providerEmail,
            providerUsername: identity.providerUsername,
          },
        });

        await transaction.profile.upsert({
          where: { userId: existingIdentity.user.id },
          create: {
            userId: existingIdentity.user.id,
            avatar: identity.avatarUrl,
            displayName: identity.displayName,
          },
          // Provider supplies defaults on first sign-in; user-managed profile data persists.
          update: {},
        });

        return existingIdentity.user;
      }

      const email = await this.accountEmail(
        transaction,
        identity.provider,
        identity.providerUserId,
        providerEmail,
      );
      const username = await this.uniqueUsername(
        transaction,
        identity.displayName || identity.providerUsername || 'creator',
        identity.providerUserId,
      );

      const createdUser = await transaction.user.create({
        data: {
          email,
          username,
          onboardingCompleted: false,
          profile: {
            create: {
              avatar: identity.avatarUrl,
              displayName: identity.displayName,
            },
          },
        },
        select: this.authUserSelect,
      });
      await transaction.userIdentity.create({
        data: {
          avatarUrl: identity.avatarUrl,
          provider: identity.provider,
          providerEmail,
          providerUserId: identity.providerUserId,
          providerUsername: identity.providerUsername,
          userId: createdUser.id,
        },
      });
      return createdUser;
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
        .replace(/[^a-z0-9_-]/g, '')
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

  private githubClientConfig() {
    if (!this.githubClientId || !this.githubClientSecret) {
      throw new ServiceUnavailableException(
        'GitHub sign-in is not configured. Add GitHub OAuth credentials.',
      );
    }
  }

  private async accountEmail(
    database: Prisma.TransactionClient,
    provider: OAuthProvider,
    providerUserId: string,
    providerEmail?: string,
  ) {
    if (providerEmail) {
      const existing = await database.user.findUnique({
        where: { email: providerEmail },
        select: { id: true },
      });
      if (!existing) return providerEmail;
    }

    const suffix = createHash('sha256')
      .update(`${provider}:${providerUserId}`)
      .digest('hex')
      .slice(0, 24);
    return `${provider.toLowerCase()}+${suffix}@oauth.vrompt.local`;
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
    accountType: AuthenticatedUser['accountType'];
    onboardingCompleted: boolean;
  }): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      accountType: user.accountType,
      onboardingCompleted: user.onboardingCompleted,
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

  private get githubClientId() {
    return this.configService.get<string>('GITHUB_CLIENT_ID', '');
  }

  private get githubClientSecret() {
    return this.configService.get<string>('GITHUB_CLIENT_SECRET', '');
  }

  private get githubCallbackUrl() {
    return this.configService.get<string>(
      'GITHUB_CALLBACK_URL',
      'http://localhost:4000/api/v1/auth/github/callback',
    );
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
    accountType: true,
    onboardingCompleted: true,
  } as const;
}
