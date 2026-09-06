import {
  Body,
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
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedRequest } from './auth.types';
import { AccessTokenGuard } from './guards/access-token.guard';
import { AuthOriginGuard } from './guards/auth-origin.guard';
import { Roles } from './decorators/roles.decorator';
import { StaffLoginDto } from './dto/staff-login.dto';
import { ChangeStaffPasswordDto } from './dto/change-staff-password.dto';

const REFRESH_COOKIE = 'vrompt_refresh_token';
const GOOGLE_STATE_COOKIE = 'vrompt_google_oauth_state';
const GITHUB_STATE_COOKIE = 'vrompt_github_oauth_state';

@Controller('auth')
@UseGuards(AuthOriginGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('staff/login')
  async staffLogin(
    @Body() input: StaffLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.assertAuthRateLimit(
      `staff-login:${this.clientIp(request)}`,
      8,
      15 * 60,
    );
    await this.authService.assertAuthRateLimit(
      `staff-account:${createHash('sha256').update(input.email.trim().toLowerCase()).digest('hex')}`,
      12,
      15 * 60,
    );
    const session = await this.authService.authenticateStaff(
      input.email,
      input.password,
    );
    this.setRefreshCookie(
      response,
      session.refreshToken,
      session.refreshExpiresAt,
    );
    return { accessToken: session.accessToken, user: session.user };
  }

  @Post('staff/password')
  @Roles('ADMIN')
  @UseGuards(AccessTokenGuard)
  async changeStaffPassword(
    @Body() input: ChangeStaffPasswordDto,
    @CurrentUser() user: AuthenticatedRequest['user'],
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.assertAuthRateLimit(
      `password:${user.id}`,
      5,
      15 * 60,
    );
    await this.authService.changeStaffPassword(
      user.id,
      input.currentPassword,
      input.newPassword,
    );
    response.clearCookie(REFRESH_COOKIE, this.cookieOptions());
    return { success: true };
  }

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
      const verifier = randomBytes(32).toString('base64url');
      response.cookie(
        GOOGLE_STATE_COOKIE + '_pkce',
        verifier,
        this.cookieOptions(5 * 60 * 1000),
      );
      response.redirect(
        this.authService.getGoogleAuthorizationUrl(state, verifier),
      );
    } catch {
      response.clearCookie(GOOGLE_STATE_COOKIE, this.cookieOptions());
      response.clearCookie(GOOGLE_STATE_COOKIE + '_pkce', this.cookieOptions());
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
    const verifier = this.getCookie(request, GOOGLE_STATE_COOKIE + '_pkce');

    if (
      typeof state !== 'string' ||
      !storedState ||
      !verifier ||
      !/^[A-Za-z0-9_-]{43}$/.test(verifier) ||
      !this.matchesState(state, storedState)
    ) {
      return this.redirectToFailure(response, GOOGLE_STATE_COOKIE, 'google');
    }

    if (typeof code !== 'string' || !code || code.length > 4096) {
      return this.redirectToFailure(response, GOOGLE_STATE_COOKIE, 'google');
    }

    try {
      await this.authService.assertAuthRateLimit(
        `google-callback:${this.clientIp(request)}`,
        20,
        15 * 60,
      );
      const session = await this.authService.exchangeGoogleCode(code, verifier);
      this.setRefreshCookie(
        response,
        session.refreshToken,
        session.refreshExpiresAt,
      );
      response.clearCookie(GOOGLE_STATE_COOKIE, this.cookieOptions());
      response.clearCookie(GOOGLE_STATE_COOKIE + '_pkce', this.cookieOptions());
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
      const verifier = randomBytes(32).toString('base64url');
      response.cookie(
        GITHUB_STATE_COOKIE + '_pkce',
        verifier,
        this.cookieOptions(5 * 60 * 1000),
      );
      response.redirect(
        this.authService.getGitHubAuthorizationUrl(state, verifier),
      );
    } catch {
      response.clearCookie(GITHUB_STATE_COOKIE, this.cookieOptions());
      response.clearCookie(GITHUB_STATE_COOKIE + '_pkce', this.cookieOptions());
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
    const verifier = this.getCookie(request, GITHUB_STATE_COOKIE + '_pkce');

    if (
      typeof state !== 'string' ||
      !storedState ||
      !verifier ||
      !/^[A-Za-z0-9_-]{43}$/.test(verifier) ||
      !this.matchesState(state, storedState)
    ) {
      return this.redirectToFailure(response, GITHUB_STATE_COOKIE, 'github');
    }

    if (typeof code !== 'string' || !code || code.length > 4096) {
      return this.redirectToFailure(response, GITHUB_STATE_COOKIE, 'github');
    }

    try {
      await this.authService.assertAuthRateLimit(
        `github-callback:${this.clientIp(request)}`,
        20,
        15 * 60,
      );
      const session = await this.authService.exchangeGitHubCode(code, verifier);
      this.setRefreshCookie(
        response,
        session.refreshToken,
        session.refreshExpiresAt,
      );
      response.clearCookie(GITHUB_STATE_COOKIE, this.cookieOptions());
      response.clearCookie(GITHUB_STATE_COOKIE + '_pkce', this.cookieOptions());
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
  @Roles('USER', 'ADMIN')
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
    response.clearCookie(stateCookie + '_pkce', this.cookieOptions());
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
      path: `/${this.configService.get<string>('API_PREFIX', 'api/v1').replace(/^\/+|\/+$/g, '')}/auth`,
      ...(maxAge ? { maxAge } : {}),
    };
  }

  private get webOrigin() {
    return this.configService
      .get<string>('WEB_ORIGIN', 'http://localhost:3000')
      .replace(/\/$/, '');
  }
}
