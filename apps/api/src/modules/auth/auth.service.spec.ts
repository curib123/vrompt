import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { OAuthProvider, UserRole, UserStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const user = {
    id: 'user-id',
    email: 'owner@example.com',
    username: 'owner',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    accountType: 'REAL',
    onboardingCompleted: false,
  };
  const configService = {
    get: jest.fn((key: string, fallback?: unknown) => {
      const values: Record<string, unknown> = {
        GOOGLE_CLIENT_ID: 'google-client-id',
        GOOGLE_CLIENT_SECRET: 'google-client-secret',
        GOOGLE_CALLBACK_URL:
          'http://localhost:4000/api/v1/auth/google/callback',
        GITHUB_CLIENT_ID: 'github-client-id',
        GITHUB_CLIENT_SECRET: 'github-client-secret',
        GITHUB_CALLBACK_URL:
          'http://localhost:4000/api/v1/auth/github/callback',
        JWT_REFRESH_TTL_SECONDS: 604800,
      };
      return values[key] ?? fallback;
    }),
  };
  const jwtService = { signAsync: jest.fn().mockResolvedValue('access-token') };

  it('creates a Vrompt user from a verified Google identity', async () => {
    const transaction = {
      userIdentity: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
      },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null),
        create: jest.fn().mockResolvedValue(user),
      },
      refreshToken: { create: jest.fn().mockResolvedValue(undefined) },
      profile: { upsert: jest.fn() },
    };
    const prismaService = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      ),
      refreshToken: { create: jest.fn().mockResolvedValue(undefined) },
    };
    const service = await createService(
      prismaService,
      configService,
      jwtService,
      { increment: jest.fn().mockResolvedValue(1) },
    );

    const session = await service.authenticateGoogle({
      avatar: 'https://example.com/avatar.png',
      displayName: 'Prompt Owner',
      email: ' Owner@Example.com ',
      subject: 'google-subject',
    });

    expect(transaction.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'owner@example.com',
          profile: expect.any(Object),
        }),
      }),
    );
    expect(transaction.userIdentity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: OAuthProvider.GOOGLE,
        providerEmail: 'owner@example.com',
        providerUserId: 'google-subject',
        userId: user.id,
      }),
    });
    expect(session).toEqual(
      expect.objectContaining({ accessToken: 'access-token' }),
    );
  });

  it('revokes the existing refresh token before issuing its replacement', async () => {
    const transaction = {
      refreshToken: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue(undefined),
      },
    };
    const prismaService = {
      refreshToken: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'refresh-id',
          expiresAt: new Date(Date.now() + 60_000),
          revokedAt: null,
          user,
        }),
      },
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      ),
    };
    const service = await createService(
      prismaService,
      configService,
      jwtService,
      { increment: jest.fn().mockResolvedValue(1) },
    );

    const session = await service.refresh('raw-refresh-token');

    expect(transaction.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { id: 'refresh-id', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(transaction.refreshToken.create).toHaveBeenCalled();
    expect(session.accessToken).toBe('access-token');
  });

  it('does not overwrite user-managed profile details on later Google sign-ins', async () => {
    const transaction = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      userIdentity: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'identity-id',
          user,
        }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
      },
      profile: { upsert: jest.fn().mockResolvedValue(undefined) },
      refreshToken: { create: jest.fn().mockResolvedValue(undefined) },
    };
    const prismaService = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      ),
      refreshToken: { create: jest.fn().mockResolvedValue(undefined) },
    };
    const service = await createService(
      prismaService,
      configService,
      jwtService,
      { increment: jest.fn().mockResolvedValue(1) },
    );

    await service.authenticateGoogle({
      avatar: 'https://example.com/new-google-avatar.png',
      displayName: 'New Google Name',
      email: user.email,
      subject: 'google-subject',
    });

    expect(transaction.profile.upsert).toHaveBeenCalledWith({
      where: { userId: user.id },
      create: {
        userId: user.id,
        avatar: 'https://example.com/new-google-avatar.png',
        displayName: 'New Google Name',
      },
      update: {},
    });
    expect(transaction.user.update).not.toHaveBeenCalled();
  });

  it('creates a GitHub identity without requiring a public email', async () => {
    const transaction = {
      userIdentity: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(undefined),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          ...user,
          id: 'github-user-id',
          email: 'github+placeholder@oauth.vrompt.local',
        }),
      },
      profile: { upsert: jest.fn() },
    };
    const prismaService = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      ),
      refreshToken: { create: jest.fn().mockResolvedValue(undefined) },
    };
    const service = await createService(
      prismaService,
      configService,
      jwtService,
      { increment: jest.fn().mockResolvedValue(1) },
    );

    await service.authenticateGitHub({
      displayName: 'GitHub Creator',
      providerUsername: 'github-creator',
      subject: '12345',
    });

    expect(transaction.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: expect.stringMatching(
            /^github\+[a-f0-9]{24}@oauth\.vrompt\.local$/,
          ),
        }),
      }),
    );
    expect(transaction.userIdentity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: OAuthProvider.GITHUB,
        providerUserId: '12345',
        providerUsername: 'github-creator',
      }),
    });
  });

  it('does not merge a new provider identity into an existing email account', async () => {
    const transaction = {
      userIdentity: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(undefined),
      },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: 'existing-email-user' })
          .mockResolvedValueOnce(null),
        create: jest.fn().mockResolvedValue({
          ...user,
          id: 'github-user-id',
          email: 'github+synthetic@oauth.vrompt.local',
        }),
      },
      profile: { upsert: jest.fn() },
    };
    const prismaService = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      ),
      refreshToken: { create: jest.fn().mockResolvedValue(undefined) },
    };
    const service = await createService(
      prismaService,
      configService,
      jwtService,
      { increment: jest.fn().mockResolvedValue(1) },
    );

    await service.authenticateGitHub({
      email: user.email,
      providerUsername: 'github-owner',
      subject: '98765',
    });

    expect(transaction.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: expect.stringMatching(
            /^github\+[a-f0-9]{24}@oauth\.vrompt\.local$/,
          ),
        }),
      }),
    );
  });

  it('requests only the GitHub profile and email scopes', async () => {
    const service = await createService(
      { $transaction: jest.fn() },
      configService,
      jwtService,
      { increment: jest.fn() },
    );

    const url = new URL(service.getGitHubAuthorizationUrl('state-value'));

    expect(url.origin).toBe('https://github.com');
    expect(url.pathname).toBe('/login/oauth/authorize');
    expect(url.searchParams.get('scope')).toBe('read:user user:email');
    expect(url.searchParams.get('state')).toBe('state-value');
    expect(url.searchParams.get('scope')).not.toMatch(/repo|org/);
  });
});

async function createService(
  prismaService: object,
  configService: object,
  jwtService: object,
  redisService: object,
) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: ConfigService, useValue: configService },
      { provide: JwtService, useValue: jwtService },
      { provide: PrismaService, useValue: prismaService },
      { provide: RedisService, useValue: redisService },
    ],
  }).compile();

  return moduleRef.get(AuthService);
}
