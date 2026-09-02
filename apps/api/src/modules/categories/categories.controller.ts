import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  list() {
    return this.categoriesService.list();
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.categoriesService.getBySlug(slug);
  }

  @Post()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() input: CreateCategoryDto) {
    return this.categoriesService.create(input);
  }

  @Patch(':slug')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('slug') slug: string, @Body() input: UpdateCategoryDto) {
    return this.categoriesService.update(slug, input);
  }

  @Delete(':slug')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('slug') slug: string) {
    return this.categoriesService.remove(slug);
  }
}
