import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { slugify } from '../common/slug';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTagDto } from './dto/create-tag.dto';
import type { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prismaService: PrismaService) {}

  async search(query = '', limit = 12) {
    const normalizedQuery = this.normalizeName(query, true);

    return this.prismaService.tag.findMany({
      where: normalizedQuery
        ? { normalizedName: { contains: normalizedQuery, mode: 'insensitive' } }
        : undefined,
      orderBy: { name: 'asc' },
      take: Math.min(Math.max(limit, 1), 30),
      select: this.tagSelect,
    });
  }

  async createOrGet(input: CreateTagDto) {
    const normalizedName = this.normalizeName(input.name);
    const existing = await this.prismaService.tag.findUnique({
      where: { normalizedName },
      select: this.tagSelect,
    });

    if (existing) {
      return existing;
    }

    try {
      return await this.prismaService.tag.create({
        data: {
          name: normalizedName,
          normalizedName,
          slug: this.tagSlug(normalizedName),
        },
        select: this.tagSelect,
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrentTag = await this.prismaService.tag.findUnique({
          where: { normalizedName },
          select: this.tagSelect,
        });

        if (concurrentTag) {
          return concurrentTag;
        }

        throw new ConflictException('A tag with that slug already exists');
      }

      throw error;
    }
  }

  async update(slug: string, input: UpdateTagDto) {
    const existing = await this.prismaService.tag.findUnique({
      where: { slug: slugify(slug) },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Tag not found');
    }

    const normalizedName = input.name
      ? this.normalizeName(input.name)
      : undefined;

    try {
      return await this.prismaService.tag.update({
        where: { id: existing.id },
        data: normalizedName
          ? {
              name: normalizedName,
              normalizedName,
              slug: this.tagSlug(normalizedName),
            }
          : {},
        select: this.tagSelect,
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A tag with that name or slug already exists',
        );
      }

      throw error;
    }
  }

  private normalizeName(value: string, allowEmpty = false) {
    const normalized = value.trim().replace(/\s+/g, ' ').toLowerCase();

    if ((!allowEmpty && normalized.length === 0) || normalized.length > 50) {
      throw new BadRequestException('Tag names must contain 1-50 characters');
    }

    if (normalized && !/[a-z0-9]/.test(normalized)) {
      throw new BadRequestException(
        'Tag names must contain a letter or number',
      );
    }

    return normalized;
  }

  private tagSlug(name: string) {
    const slug = slugify(name);

    if (!slug) {
      throw new BadRequestException(
        'Tag names must contain a letter or number',
      );
    }

    return slug;
  }

  private readonly tagSelect = {
    id: true,
    name: true,
    slug: true,
    createdAt: true,
    updatedAt: true,
  } as const;
}
