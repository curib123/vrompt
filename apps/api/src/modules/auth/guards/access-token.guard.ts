import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth.types';

interface AccessTokenPayload {
  sub: string;
  sid: string;
  role: UserRole;
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request
      .header('authorization')
      ?.match(/^Bearer ([^\s]+)$/i)?.[1];

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<AccessTokenPayload>(token);
      const uuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuid.test(payload.sub ?? '') || !uuid.test(payload.sid ?? ''))
        throw new UnauthorizedException('Invalid session');
      const session = await this.prismaService.refreshToken.findFirst({
        where: {
          familyId: payload.sid,
          userId: payload.sub,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              role: true,
              accountType: true,
              plan: true,
              onboardingCompleted: true,
              status: true,
              guestKey: true,
            },
          },
        },
      });
      const user = session?.user;

      if (
        !user ||
        user.status !== UserStatus.ACTIVE ||
        user.guestKey ||
        user.role !== payload.role
      ) {
        throw new UnauthorizedException('Authentication required');
      }

      if (user.role !== UserRole.USER && user.role !== UserRole.ADMIN)
        throw new ForbiddenException(
          'This account role is no longer supported',
        );

      const allowedRoles = this.reflector.getAllAndOverride<UserRole[]>(
        ROLES_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (allowedRoles?.length && !allowedRoles.includes(user.role))
        throw new ForbiddenException('Insufficient permissions');
      const isStaff = user.role === UserRole.ADMIN;
      if (isStaff && !allowedRoles?.includes(user.role)) {
        throw new ForbiddenException(
          'Staff accounts are restricted to the control panel',
        );
      }

      request.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        accountType: user.accountType,
        plan: user.plan,
        onboardingCompleted: user.onboardingCompleted,
      };
      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
