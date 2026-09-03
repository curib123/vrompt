import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedRequest } from '../auth.types';

interface AccessTokenPayload {
  sub: string;
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
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
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
