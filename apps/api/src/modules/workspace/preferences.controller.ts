import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
class PreferencesDto {
  @IsString() @MaxLength(80) displayName!: string;
  @IsOptional() @IsUUID() defaultModelId?: string | null;
  @IsBoolean() sendOnEnter!: boolean;
}
@Controller('workspace/preferences')
@UseGuards(AccessTokenGuard)
export class PreferencesController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() async get(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId: user.id },
      select: { displayName: true, preferences: true },
    });
    const preferences = (profile?.preferences ?? {}) as {
      defaultModelId?: string | null;
      sendOnEnter?: boolean;
    };
    return {
      displayName: profile?.displayName ?? user.username,
      defaultModelId: preferences.defaultModelId ?? null,
      sendOnEnter: preferences.sendOnEnter !== false,
    };
  }
  @Patch() async update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: PreferencesDto,
  ) {
    const data = {
      displayName: input.displayName.trim(),
      preferences: {
        defaultModelId: input.defaultModelId ?? null,
        sendOnEnter: input.sendOnEnter,
      },
    };
    await this.prisma.profile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
    });
    return this.get(user);
  }
}
