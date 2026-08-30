import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { CurrentUser } from './decorators/current-user.decorator';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AccessTokenGuard } from './guards/access-token.guard';

const REFRESH_COOKIE = 'vrompt_refresh_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(
    @Body() input: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.register(input);
    this.setRefreshCookie(
      response,
      session.refreshToken,
      session.refreshExpiresAt,
    );
    return { accessToken: session.accessToken, user: session.user };
  }

  @Post('login')
  async login(
    @Body() input: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.login(
      input,
      request.ip ?? 'unknown',
    );
    this.setRefreshCookie(
      response,
      session.refreshToken,
      session.refreshExpiresAt,
    );
    return { accessToken: session.accessToken, user: session.user };
  }

  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = this.getRefreshCookie(request);
    const session = await this.authService.refresh(refreshToken);
    this.setRefreshCookie(
      response,
      session.refreshToken,
      session.refreshExpiresAt,
    );
    return { accessToken: session.accessToken, user: session.user };
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(this.getRefreshCookie(request, false));
    response.clearCookie(REFRESH_COOKIE, this.cookieOptions());
    return { success: true };
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  async me(@CurrentUser() user: AuthenticatedRequest['user']) {
    return this.authService.getCurrentUser(user.id);
  }

  private setRefreshCookie(response: Response, token: string, expiresAt: Date) {
    response.cookie(REFRESH_COOKIE, token, {
      ...this.cookieOptions(),
      expires: expiresAt,
    });
  }

  private getRefreshCookie(request: Request): string;
  private getRefreshCookie(
    request: Request,
    required: false,
  ): string | undefined;
  private getRefreshCookie(request: Request, required = true) {
    const header = request.headers.cookie;
    const token = header
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${REFRESH_COOKIE}=`))
      ?.slice(REFRESH_COOKIE.length + 1);

    if (!token && required) {
      throw new UnauthorizedException('Refresh token is required');
    }

    return token;
  }

  private cookieOptions() {
    const sameSite = this.configService.get<string>(
      'AUTH_COOKIE_SAME_SITE',
      'lax',
    );

    return {
      httpOnly: true,
      secure: this.configService.get<boolean>('AUTH_COOKIE_SECURE', false),
      sameSite: sameSite as 'lax' | 'strict' | 'none',
      path: '/api/v1/auth',
    };
  }
}
