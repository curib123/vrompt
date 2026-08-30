import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FollowsService {
  constructor(private readonly prismaService: PrismaService) {}

  async follow(actorId: string, username: string) {
    const target = await this.findActiveUser(username);
    this.assertNotSelf(actorId, target.id);

    try {
      await this.prismaService.follow.create({
        data: { followerId: actorId, followingId: target.id },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.followState(target.id, true);
      }
      throw error;
    }

    return this.followState(target.id, true);
  }

  async unfollow(actorId: string, username: string) {
    const target = await this.findActiveUser(username);
    this.assertNotSelf(actorId, target.id);
    await this.prismaService.follow.deleteMany({
      where: { followerId: actorId, followingId: target.id },
    });

    return this.followState(target.id, false);
  }

  async list(
    username: string,
    kind: 'followers' | 'following',
    page = 1,
    pageSize = 30,
  ) {
    const target = await this.findActiveUser(username);
    const safePage = Math.max(page, 1);
    const safePageSize = Math.min(Math.max(pageSize, 1), 50);
    const where =
      kind === 'followers'
        ? { followingId: target.id, follower: { status: UserStatus.ACTIVE } }
        : { followerId: target.id, following: { status: UserStatus.ACTIVE } };
    const relation = kind === 'followers' ? 'follower' : 'following';
    const [items, total] = await Promise.all([
      this.prismaService.follow.findMany({
        where,
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          createdAt: true,
          [relation]: {
            select: {
              id: true,
              username: true,
              profile: { select: { displayName: true, avatar: true } },
            },
          },
        },
      }),
      this.prismaService.follow.count({ where }),
    ]);

    return {
      items,
      page: safePage,
      pageSize: safePageSize,
      total,
      hasNextPage: safePage * safePageSize < total,
    };
  }

  private async findActiveUser(username: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        username: username.trim().toLowerCase(),
        status: UserStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('Profile not found');
    }
    return user;
  }

  private assertNotSelf(actorId: string, targetId: string) {
    if (actorId === targetId) {
      throw new ForbiddenException('You cannot follow your own profile');
    }
  }

  private async followState(targetId: string, following: boolean) {
    const followerCount = await this.prismaService.follow.count({
      where: { followingId: targetId },
    });
    return { following, followerCount };
  }
}
