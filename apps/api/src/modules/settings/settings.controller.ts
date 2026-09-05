import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}
  @Get('public') publicSettings() {
    return this.service.publicSettings();
  }
}

@Controller('admin/settings')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminSettingsController {
  constructor(private readonly service: SettingsService) {}
  @Get() list() {
    return this.service.adminSettings();
  }
  @Patch(':key') update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('key') key: string,
    @Body() input: UpdateSettingDto,
  ) {
    return this.service.update(actor.id, key, input.value);
  }
  @Delete(':key') reset(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('key') key: string,
  ) {
    return this.service.reset(actor.id, key);
  }

}
