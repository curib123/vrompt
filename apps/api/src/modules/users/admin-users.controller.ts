import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminUsersService } from './admin-users.service';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Controller('admin')
@UseGuards(AccessTokenGuard, RolesGuard)
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  dashboard() {
    return this.service.dashboard();
  }

  @Get('system')
  @Roles(UserRole.ADMIN)
  system() {
    return this.service.system();
  }

  @Get('users')
  @Roles(UserRole.ADMIN)
  list(@Query() input: AdminUserQueryDto) {
    return this.service.list(input);
  }

  @Post('users')
  @Roles(UserRole.ADMIN)
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() input: CreateStaffUserDto,
  ) {
    return this.service.createStaff(actor.id, input);
  }

  @Patch('users/:userId')
  @Roles(UserRole.ADMIN)
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() input: UpdateAdminUserDto,
  ) {
    return this.service.update(actor.id, userId, input);
  }
}
