import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  AccountType,
  MembershipPlan,
  UserRole,
  UserStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AccessTokenGuard } from './access-token.guard';

describe('AccessTokenGuard staff separation', () => {
  const jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: 'staff-1' }) };
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'staff-1',
        email: 'staff@example.com',
        username: 'staff',
        role: UserRole.ADMIN,
        accountType: AccountType.OFFICIAL,
        plan: MembershipPlan.FREE,
        onboardingCompleted: true,
        status: UserStatus.ACTIVE,
      }),
    },
  };

  function context(path: string) {
    const request = {
      header: jest.fn().mockReturnValue('Bearer token'),
      path,
    };
    return {
      request,
      context: {
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: () => function handler() {},
        getClass: () => class Controller {},
      } as never,
    };
  }

  it('rejects staff accounts on ordinary user endpoints', async () => {
    const guard = new AccessTokenGuard(
      jwt as unknown as JwtService,
      prisma as unknown as PrismaService,
      { getAllAndOverride: jest.fn() } as unknown as Reflector,
    );
    const request = context('/api/v1/saved');

    await expect(guard.canActivate(request.context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows staff accounts on explicitly authorized control-panel endpoints', async () => {
    const guard = new AccessTokenGuard(
      jwt as unknown as JwtService,
      prisma as unknown as PrismaService,
      {
        getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
      } as unknown as Reflector,
    );
    const request = context('/api/v1/admin/system');

    await expect(guard.canActivate(request.context)).resolves.toBe(true);
  });
  it('rejects an ordinary user on an admin endpoint even without RolesGuard', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    } as never);
    const guard = new AccessTokenGuard(
      jwt as unknown as JwtService,
      prisma as unknown as PrismaService,
      {
        getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
      } as unknown as Reflector,
    );
    await expect(
      guard.canActivate(context('/api/v1/admin/workspace/models').context),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('rejects retired moderator accounts even when legacy route metadata allows them', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'legacy',
      role: UserRole.MODERATOR,
      status: UserStatus.ACTIVE,
    } as never);
    const guard = new AccessTokenGuard(
      jwt as unknown as JwtService,
      prisma as unknown as PrismaService,
      {
        getAllAndOverride: jest.fn().mockReturnValue([UserRole.MODERATOR]),
      } as unknown as Reflector,
    );
    await expect(
      guard.canActivate(context('/api/v1/admin/dashboard').context),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
