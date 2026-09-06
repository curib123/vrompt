import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AccessTokenGuard } from './access-token.guard';

describe('session authentication and role authorization', () => {
  const id = randomUUID();
  const sid = randomUUID();
  let jwt: { verifyAsync: jest.Mock };
  let prisma: { refreshToken: { findFirst: jest.Mock } };
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: AccessTokenGuard;
  function context(header = 'Bearer token', path = '/api/v1/workspace') {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ header: () => header, path }),
      }),
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
    } as never;
  }
  function account(
    role: string,
    status = 'ACTIVE',
    guestKey: string | null = null,
  ) {
    jwt.verifyAsync.mockResolvedValue({ sub: id, sid, role });
    prisma.refreshToken.findFirst.mockResolvedValue({
      user: { id, role, status, guestKey },
    });
  }
  beforeEach(() => {
    jwt = { verifyAsync: jest.fn() };
    prisma = { refreshToken: { findFirst: jest.fn() } };
    reflector = { getAllAndOverride: jest.fn() };
    guard = new AccessTokenGuard(
      jwt as never,
      prisma as never,
      reflector as never,
    );
    account('USER');
  });
  it('accepts a live session and checks expiry and revocation', async () => {
    await expect(guard.canActivate(context())).resolves.toBe(true);
    expect(prisma.refreshToken.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          familyId: sid,
          userId: id,
          revokedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
      }),
    );
  });
  it.each(['token', 'Basic token', 'Bearer token extra', ''])(
    'rejects malformed authorization: %s',
    async (header) => {
      await expect(guard.canActivate(context(header))).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    },
  );
  it('rejects old tokens without a session identifier', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: id, role: 'USER' });
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
  it('rejects logged-out, expired and revoked sessions', async () => {
    prisma.refreshToken.findFirst.mockResolvedValue(null);
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
  it.each(['SUSPENDED', 'DELETED'])('rejects %s accounts', async (status) => {
    account('USER', status);
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
  it('rejects a guest identity even if it has a signed token', async () => {
    account('USER', 'ACTIVE', 'guest');
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
  it('does not grant new administrator access to an old user token', async () => {
    prisma.refreshToken.findFirst.mockResolvedValue({
      user: { id, role: 'ADMIN', status: 'ACTIVE' },
    });
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
  it('rejects users on admin endpoints without needing another guard', async () => {
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
  it('requires explicit metadata for admins, including auth-looking URLs', async () => {
    account('ADMIN');
    await expect(
      guard.canActivate(context('Bearer token', '/anything/auth/bypass')),
    ).rejects.toBeInstanceOf(ForbiddenException);
    reflector.getAllAndOverride.mockReturnValue(['ADMIN']);
    await expect(guard.canActivate(context())).resolves.toBe(true);
  });
  it('rejects the retired moderator role', async () => {
    account('MODERATOR');
    reflector.getAllAndOverride.mockReturnValue(['MODERATOR']);
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
