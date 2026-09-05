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
    const token = request.header('authorization')?.replace(/^Bearer\s+/i, '');

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<AccessTokenPayload>(token);
      const user = await this.prismaService.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          accountType: true,
          plan: true,
          onboardingCompleted: true,
          status: true,
        },
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
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
      const isStaffAuthRoute = request.path.includes('/auth/');
      if (isStaff && !isStaffAuthRoute && !allowedRoles?.includes(user.role)) {
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
