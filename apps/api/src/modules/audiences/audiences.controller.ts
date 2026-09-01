import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AudienceSelectionDto } from './dto/audience-selection.dto';
import { CreateAudienceDto } from './dto/create-audience.dto';
import { UpdateAudienceDto } from './dto/update-audience.dto';
import { AudiencesService } from './audiences.service';

@Controller('audiences')
export class AudiencesController {
  constructor(private readonly audiencesService: AudiencesService) {}

  @Get()
  list() {
    return this.audiencesService.listActive();
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.audiencesService.getBySlug(slug);
  }
}

@Controller('me/audiences')
@UseGuards(AccessTokenGuard)
export class MyAudiencesController {
  constructor(private readonly audiencesService: AudiencesService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.audiencesService.getUserAudiences(user.id);
  }

  @Put()
  update(
    @Body() input: AudienceSelectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.audiencesService.updateUserAudiences(
      user.id,
      input.audienceIds,
    );
  }
}

@Controller('admin/audiences')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.MODERATOR, UserRole.ADMIN)
export class AdminAudiencesController {
  constructor(private readonly audiencesService: AudiencesService) {}

  @Get()
  list() {
    return this.audiencesService.adminList();
  }

  @Post()
  create(
    @Body() input: CreateAudienceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.audiencesService.create(user.id, input);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() input: UpdateAudienceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.audiencesService.update(user.id, id, input);
  }
}
