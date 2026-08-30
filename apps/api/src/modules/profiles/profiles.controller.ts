import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  @UseGuards(AccessTokenGuard)
  getOwnProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profilesService.getOwnProfile(user.id);
  }

  @Patch('me')
  @UseGuards(AccessTokenGuard)
  updateOwnProfile(
    @Body() input: UpdateProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.profilesService.updateOwnProfile(user.id, input);
  }

  @Post('me/avatar')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        const acceptedTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
        ];

        if (!acceptedTypes.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              'Avatar must be a JPEG, PNG, WebP, or GIF image',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  uploadAvatar(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('An avatar image is required');
    }

    return this.profilesService.uploadOwnAvatar(user.id, {
      buffer: file.buffer,
      contentType: file.mimetype,
      filename: file.originalname,
    });
  }

  @Get(':username')
  getPublicProfile(@Param('username') username: string) {
    return this.profilesService.getPublicProfile(username);
  }
}
