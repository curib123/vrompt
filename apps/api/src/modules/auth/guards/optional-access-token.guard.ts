import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedRequest } from '../auth.types';

interface AccessTokenPayload {
  sub: string;
}

@Injectable()
export class OptionalAccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.header('authorization')?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return true;
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
          status: true,
        },
      });

      if (user?.status === UserStatus.ACTIVE) {
        request.user = {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          accountType: user.accountType,
        };
      }
    } catch {
      // Invalid optional credentials behave like an anonymous request.
    }

    return true;
  }
}
