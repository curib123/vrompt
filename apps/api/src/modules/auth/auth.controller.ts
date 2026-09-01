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
const GITHUB_STATE_COOKIE = 'vrompt_github_oauth_state';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('google')
  async google(@Req() request: Request, @Res() response: Response) {
    const state = randomBytes(32).toString('base64url');

    try {
      await this.authService.assertAuthRateLimit(
        `google-start:${this.clientIp(request)}`,
        20,
        15 * 60,
      );
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
      return this.redirectToFailure(response, GOOGLE_STATE_COOKIE, 'google');
    }

    if (!code) {
      return this.redirectToFailure(response, GOOGLE_STATE_COOKIE, 'google');
    }

    try {
      await this.authService.assertAuthRateLimit(
        `google-callback:${this.clientIp(request)}`,
        20,
        15 * 60,
      );
      const session = await this.authService.exchangeGoogleCode(code);
      this.setRefreshCookie(
        response,
        session.refreshToken,
        session.refreshExpiresAt,
      );
      response.clearCookie(GOOGLE_STATE_COOKIE, this.cookieOptions());
      return response.redirect(`${this.webOrigin}/auth/callback`);
    } catch {
      return this.redirectToFailure(response, GOOGLE_STATE_COOKIE, 'google');
    }
  }

  @Get('github')
  async github(@Req() request: Request, @Res() response: Response) {
    const state = randomBytes(32).toString('base64url');

    try {
      await this.authService.assertAuthRateLimit(
        `github-start:${this.clientIp(request)}`,
        20,
        15 * 60,
      );
      response.cookie(GITHUB_STATE_COOKIE, state, {
        ...this.cookieOptions(5 * 60 * 1000),
        maxAge: 5 * 60 * 1000,
      });
      response.redirect(this.authService.getGitHubAuthorizationUrl(state));
    } catch {
      response.clearCookie(GITHUB_STATE_COOKIE, this.cookieOptions());
      response.redirect(`${this.webOrigin}/login?error=github_not_configured`);
    }
  }

  @Get('github/callback')
  async githubCallback(
    @Req() request: Request,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Res() response: Response,
  ) {
    const storedState = this.getCookie(request, GITHUB_STATE_COOKIE);

    if (!state || !storedState || !this.matchesState(state, storedState)) {
      return this.redirectToFailure(response, GITHUB_STATE_COOKIE, 'github');
    }

    if (!code) {
      return this.redirectToFailure(response, GITHUB_STATE_COOKIE, 'github');
    }

    try {
      await this.authService.assertAuthRateLimit(
        `github-callback:${this.clientIp(request)}`,
        20,
        15 * 60,
      );
      const session = await this.authService.exchangeGitHubCode(code);
      this.setRefreshCookie(
        response,
        session.refreshToken,
        session.refreshExpiresAt,
      );
      response.clearCookie(GITHUB_STATE_COOKIE, this.cookieOptions());
      return response.redirect(`${this.webOrigin}/auth/callback`);
    } catch {
      return this.redirectToFailure(response, GITHUB_STATE_COOKIE, 'github');
    }
  }

  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.assertAuthRateLimit(
      `refresh:${this.clientIp(request)}`,
      30,
      60,
    );
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

  private clientIp(request: Request) {
    return request.ip || request.socket.remoteAddress || 'unknown';
  }

  private matchesState(expected: string, received: string) {
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received);

    return (
      expectedBuffer.length === receivedBuffer.length &&
      timingSafeEqual(expectedBuffer, receivedBuffer)
    );
  }

  private redirectToFailure(
    response: Response,
    stateCookie: string,
    provider: 'google' | 'github',
  ) {
    response.clearCookie(stateCookie, this.cookieOptions());
    return response.redirect(
      `${this.webOrigin}/login?error=${provider}_auth_failed`,
    );
  }

  private cookieOptions(maxAge?: number) {
    const sameSite = this.configService.get<string>(
      'AUTH_COOKIE_SAME_SITE',
      'lax',
    );

    return {
      httpOnly: true,
      secure:
        this.configService.get<string>('NODE_ENV') === 'production' ||
        this.configService.get<boolean>('AUTH_COOKIE_SECURE', false),
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
