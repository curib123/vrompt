import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagsService } from './tags.service';

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  search(
    @Query('q') query: string | undefined,
    @Query('limit', new DefaultValuePipe(12), ParseIntPipe) limit: number,
  ) {
    return this.tagsService.search(query, limit);
  }

  @Post()
  @UseGuards(AccessTokenGuard)
  createOrGet(@Body() input: CreateTagDto) {
    return this.tagsService.createOrGet(input);
  }

  @Patch(':slug')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('slug') slug: string, @Body() input: UpdateTagDto) {
    return this.tagsService.update(slug, input);
  }
}
