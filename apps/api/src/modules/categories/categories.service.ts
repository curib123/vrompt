import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { slugify } from '../common/slug';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prismaService: PrismaService) {}

  list() {
    return this.prismaService.category.findMany({
      orderBy: { name: 'asc' },
      select: this.categorySelect,
    });
  }

  async getBySlug(slug: string) {
    const category = await this.prismaService.category.findUnique({
      where: { slug: slugify(slug) },
      select: this.categorySelect,
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async create(input: CreateCategoryDto) {
    const name = this.normalizeName(input.name);
    const slug = slugify(input.slug || name);

    if (!slug) {
      throw new BadRequestException(
        'Category names must contain a letter or number',
      );
    }

    try {
      return await this.prismaService.category.create({
        data: { name, slug },
        select: this.categorySelect,
      });
    } catch (error: unknown) {
      this.throwConflict(error);
    }
  }

  async update(slug: string, input: UpdateCategoryDto) {
    const existing = await this.prismaService.category.findUnique({
      where: { slug: slugify(slug) },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    const data = {
      ...(input.name ? { name: this.normalizeName(input.name) } : {}),
      ...(input.slug ? { slug: slugify(input.slug) } : {}),
    };

    if (data.slug === '') {
      throw new BadRequestException(
        'Category slugs must contain a letter or number',
      );
    }

    try {
      return await this.prismaService.category.update({
        where: { id: existing.id },
        data,
        select: this.categorySelect,
      });
    } catch (error: unknown) {
      this.throwConflict(error);
    }
  }

  async remove(slug: string) {
    const existing = await this.prismaService.category.findUnique({
      where: { slug: slugify(slug) },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Category not found');
    await this.prismaService.category.delete({ where: { id: existing.id } });
    return { success: true };
  }

  private normalizeName(name: string) {
    return name.trim().replace(/\s+/g, ' ');
  }

  private throwConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A category with that name or slug already exists',
      );
    }

    throw error;
  }

  private readonly categorySelect = {
    id: true,
    name: true,
    slug: true,
    createdAt: true,
    updatedAt: true,
  } as const;
}
