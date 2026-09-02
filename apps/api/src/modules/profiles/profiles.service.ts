import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';

import { MediaStorageService } from '../common/media-storage/media-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';

const usernamePattern = /^[a-z0-9](?:[a-z0-9_-]{1,30}[a-z0-9])?$/;

const profileSelect = {
  id: true,
  username: true,
  accountType: true,
  createdAt: true,
  profile: {
    select: {
      displayName: true,
      bio: true,
      avatar: true,
      website: true,
    },
  },
  _count: {
    select: {
      ownedRepositories: {
        where: {
          visibility: 'PUBLIC',
          status: 'ACTIVE',
        },
      },
      followers: true,
      following: true,
    },
  },
  ownedRepositories: {
    where: {
      visibility: 'PUBLIC',
      status: 'ACTIVE',
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      updatedAt: true,
      promptAudiences: {
        select: {
          audience: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { audience: { sortOrder: 'asc' } },
      },
    },
  },
  collections: {
    where: {
      visibility: 'PUBLIC',
      archivedAt: null,
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      updatedAt: true,
      _count: { select: { items: true } },
    },
  },
} as const;

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mediaStorageService: MediaStorageService,
  ) {}

  async getPublicProfile(username: string, viewerId?: string) {
    const normalizedUsername = this.normalizeUsername(username);

    if (!usernamePattern.test(normalizedUsername)) {
      throw new BadRequestException('Invalid username');
    }

    const user = await this.prismaService.user.findFirst({
      where: { username: normalizedUsername, status: UserStatus.ACTIVE },
      select: profileSelect,
    });

    if (!user) {
      throw new NotFoundException('Profile not found');
    }

    const isFollowing = viewerId
      ? Boolean(
          await this.prismaService.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId: viewerId,
                followingId: user.id,
              },
            },
            select: { followerId: true },
          }),
        )
      : false;

    return this.toProfileResponse(user, isFollowing);
  }

  async getOwnProfile(userId: string) {
    const user = await this.prismaService.user.findFirst({
      where: { id: userId, status: UserStatus.ACTIVE },
      select: profileSelect,
    });

    if (!user) {
      throw new NotFoundException('Profile not found');
    }

    return this.toProfileResponse(user, false);
  }

  async updateOwnProfile(userId: string, input: UpdateProfileDto) {
    const data = {
      ...(input.username
        ? { username: this.normalizeUsername(input.username) }
        : {}),
    };

    if (data.username && !usernamePattern.test(data.username)) {
      throw new BadRequestException('Invalid username');
    }

    try {
      await this.prismaService.$transaction(async (transaction) => {
        const user = await transaction.user.findFirst({
          where: { id: userId, status: UserStatus.ACTIVE },
          select: { id: true },
        });

        if (!user) {
          throw new NotFoundException('Profile not found');
        }

        if (Object.keys(data).length > 0) {
          await transaction.user.update({ where: { id: userId }, data });
        }

        await transaction.profile.upsert({
          where: { userId },
          create: {
            userId,
            displayName: this.cleanNullable(input.displayName),
            bio: this.cleanNullable(input.bio),
            website: this.cleanNullable(input.website),
          },
          update: {
            ...(input.displayName !== undefined
              ? { displayName: this.cleanNullable(input.displayName) }
              : {}),
            ...(input.bio !== undefined
              ? { bio: this.cleanNullable(input.bio) }
              : {}),
            ...(input.website !== undefined
              ? { website: this.cleanNullable(input.website) }
              : {}),
          },
        });
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('That username is already taken');
      }

      throw error;
    }

    return this.getOwnProfile(userId);
  }

  async updateOwnAvatar(userId: string, avatar: string) {
    const user = await this.prismaService.user.findFirst({
      where: { id: userId, status: UserStatus.ACTIVE },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Profile not found');
    }

    await this.prismaService.profile.upsert({
      where: { userId },
      create: { userId, avatar },
      update: { avatar },
    });

    return this.getOwnProfile(userId);
  }

  async uploadOwnAvatar(
    userId: string,
    input: {
      buffer: Buffer;
      contentType: string;
      filename: string;
    },
  ) {
    const storedMedia = await this.mediaStorageService.upload(input);

    try {
      return await this.updateOwnAvatar(userId, storedMedia.secureUrl);
    } catch (error: unknown) {
      await this.mediaStorageService.delete(
        storedMedia.storageKey,
        storedMedia.provider,
      );
      throw error;
    }
  }

  private cleanNullable(value: string | null | undefined) {
    if (value === null || value === undefined) {
      return value ?? null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeUsername(username: string) {
    return username.trim().toLowerCase();
  }

  private toProfileResponse(user: ProfileRecord, isFollowing: boolean) {
    return {
      id: user.id,
      username: user.username,
      accountType: user.accountType,
      displayName: user.profile?.displayName ?? null,
      bio: user.profile?.bio ?? null,
      avatar: user.profile?.avatar ?? null,
      website: user.profile?.website ?? null,
      createdAt: user.createdAt,
      stats: {
        repositories: user._count.ownedRepositories,
        followers: user._count.followers,
        following: user._count.following,
      },
      isFollowing,
      repositories: user.ownedRepositories,
      collections: user.collections,
    };
  }
}

type ProfileRecord = Prisma.UserGetPayload<{
  select: typeof profileSelect;
}>;
