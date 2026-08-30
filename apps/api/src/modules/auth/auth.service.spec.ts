import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { UserRole, UserStatus } from '@prisma/client';
import { compare, hash } from 'bcryptjs';

import { RedisService } from '../common/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const user = {
    id: 'user-id',
    email: 'owner@example.com',
    username: 'owner',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
  };
  const configService = {
    get: jest.fn((key: string, fallback?: unknown) => {
      const values: Record<string, unknown> = {
        JWT_REFRESH_TTL_SECONDS: 604800,
      };
      return values[key] ?? fallback;
    }),
  };
  const jwtService = { signAsync: jest.fn().mockResolvedValue('access-token') };
  const redisService = {
    increment: jest.fn().mockResolvedValue(1),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  it('normalizes registration fields and stores a password hash', async () => {
    const transaction = {
      user: {
        create: jest.fn().mockResolvedValue(user),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };
    const prismaService = {
      refreshToken: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      ),
    };
    const service = await createService(
      prismaService,
      configService,
      jwtService,
      redisService,
    );

    const session = await service.register({
      email: ' Owner@Example.com ',
      username: ' Owner ',
      password: 'strong-password',
    });

    const createCall = transaction.user.create.mock.calls[0][0];
    expect(createCall.data.email).toBe('owner@example.com');
    expect(createCall.data.username).toBe('owner');
    expect(createCall.data.passwordHash).not.toBe('strong-password');
    await expect(
      compare('strong-password', createCall.data.passwordHash),
    ).resolves.toBe(true);
    expect(session).toEqual(
      expect.objectContaining({
        accessToken: 'access-token',
        user: expect.objectContaining({
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        }),
      }),
    );
    expect(prismaService.refreshToken.create).toHaveBeenCalled();
  });

  it('logs in with a valid password and clears the throttle key', async () => {
    const passwordHash = await hash('strong-password', 4);
    const prismaService = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ ...user, passwordHash }),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };
    const service = await createService(
      prismaService,
      configService,
      jwtService,
      redisService,
    );

    await service.login(
      { email: 'OWNER@example.com', password: 'strong-password' },
      '127.0.0.1',
    );

    expect(redisService.increment).toHaveBeenCalled();
    expect(redisService.delete).toHaveBeenCalled();
    expect(prismaService.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'owner@example.com' } }),
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
          tokenHash: 'stored-hash',
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
      redisService,
    );

    const session = await service.refresh('raw-refresh-token');

    expect(transaction.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { id: 'refresh-id', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(transaction.refreshToken.create).toHaveBeenCalled();
    expect(session.accessToken).toBe('access-token');
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
