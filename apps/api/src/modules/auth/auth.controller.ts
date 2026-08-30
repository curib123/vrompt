import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedRequest } from './auth.types';
import { AccessTokenGuard } from './guards/access-token.guard';

const REFRESH_COOKIE = 'vrompt_refresh_token';
const GOOGLE_STATE_COOKIE = 'vrompt_google_oauth_state';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('google')
  google(@Res() response: Response) {
    const state = randomBytes(32).toString('base64url');

    try {
      response.cookie(GOOGLE_STATE_COOKIE, state, {
        ...this.cookieOptions(5 * 60 * 1000),
        maxAge: 5 * 60 * 1000,
      });
      response.redirect(this.authService.getGoogleAuthorizationUrl(state));
    } catch {
      response.clearCookie(GOOGLE_STATE_COOKIE, this.cookieOptions());
      response.redirect(`${this.webOrigin}/login?error=google_not_configured`);
    }
  }

  @Get('google/callback')
  async googleCallback(
    @Req() request: Request,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Res() response: Response,
  ) {
    const storedState = this.getCookie(request, GOOGLE_STATE_COOKIE);

    if (!state || !storedState || !this.matchesState(state, storedState)) {
      return this.redirectToFailure(response);
    }

    if (!code) {
      return this.redirectToFailure(response);
    }

    try {
      const session = await this.authService.exchangeGoogleCode(code);
      this.setRefreshCookie(
        response,
        session.refreshToken,
        session.refreshExpiresAt,
      );
      response.clearCookie(GOOGLE_STATE_COOKIE, this.cookieOptions());
      return response.redirect(this.webOrigin);
    } catch {
      return this.redirectToFailure(response);
    }
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
    const token = this.getCookie(request, REFRESH_COOKIE);

    if (!token && required) {
      throw new UnauthorizedException('Refresh token is required');
    }

    return token;
  }

  private getCookie(request: Request, name: string) {
    return request.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1);
  }

  private matchesState(expected: string, received: string) {
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received);

    return (
      expectedBuffer.length === receivedBuffer.length &&
      timingSafeEqual(expectedBuffer, receivedBuffer)
    );
  }

  private redirectToFailure(response: Response) {
    response.clearCookie(GOOGLE_STATE_COOKIE, this.cookieOptions());
    return response.redirect(
      `${this.webOrigin}/login?error=google_auth_failed`,
    );
  }

  private cookieOptions(maxAge?: number) {
    const sameSite = this.configService.get<string>(
      'AUTH_COOKIE_SAME_SITE',
      'lax',
    );

    return {
      httpOnly: true,
      secure: this.configService.get<boolean>('AUTH_COOKIE_SECURE', false),
      sameSite: sameSite as 'lax' | 'strict' | 'none',
      path: '/api/v1/auth',
      ...(maxAge ? { maxAge } : {}),
    };
  }

  private get webOrigin() {
    return this.configService
      .get<string>('WEB_ORIGIN', 'http://localhost:3000')
      .replace(/\/$/, '');
  }
}
