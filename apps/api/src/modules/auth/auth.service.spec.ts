import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { UserRole, UserStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const user = {
    id: 'user-id',
    email: 'owner@example.com',
    username: 'owner',
    googleId: 'google-subject',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    accountType: 'REAL',
  };
  const configService = {
    get: jest.fn((key: string, fallback?: unknown) => {
      const values: Record<string, unknown> = {
        GOOGLE_CLIENT_ID: 'google-client-id',
        GOOGLE_CLIENT_SECRET: 'google-client-secret',
        GOOGLE_CALLBACK_URL:
          'http://localhost:4000/api/v1/auth/google/callback',
        JWT_REFRESH_TTL_SECONDS: 604800,
      };
      return values[key] ?? fallback;
    }),
  };
  const jwtService = { signAsync: jest.fn().mockResolvedValue('access-token') };

  it('creates a Vrompt user from a verified Google identity', async () => {
    const transaction = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(null)
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
          googleId: 'google-subject',
          profile: expect.any(Object),
        }),
      }),
    );
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
        findUnique: jest.fn().mockResolvedValueOnce(user),
        update: jest.fn().mockResolvedValue(user),
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
      subject: user.googleId,
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
