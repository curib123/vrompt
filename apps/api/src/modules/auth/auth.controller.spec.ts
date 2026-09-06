import type { Request } from 'express';

import { AuthController } from './auth.controller';

describe('AuthController OAuth routes', () => {
  const authService = {
    assertAuthRateLimit: jest.fn().mockResolvedValue(undefined),
    getGoogleAuthorizationUrl: jest
      .fn()
      .mockReturnValue('https://accounts.google.com/oauth'),
    getGitHubAuthorizationUrl: jest
      .fn()
      .mockReturnValue('https://github.com/login/oauth/authorize'),
    exchangeGoogleCode: jest.fn(),
    exchangeGitHubCode: jest.fn(),
  };
  const configService = {
    get: jest.fn((key: string, fallback?: unknown) => {
      const values: Record<string, unknown> = {
        WEB_ORIGIN: 'http://localhost:3000',
        AUTH_COOKIE_SECURE: false,
        AUTH_COOKIE_SAME_SITE: 'lax',
      };
      return values[key] ?? fallback;
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts GitHub OAuth with a state cookie and rate limit', async () => {
    const controller = new AuthController(
      authService as never,
      configService as never,
    );
    const response = createResponse();

    await controller.github(createRequest(), response as never);

    expect(authService.assertAuthRateLimit).toHaveBeenCalledWith(
      expect.stringMatching(/^github-start:/),
      20,
      900,
    );
    expect(response.cookie).toHaveBeenCalledWith(
      'vrompt_github_oauth_state',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, maxAge: 300000 }),
    );
    expect(authService.getGitHubAuthorizationUrl).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
    );
    expect(response.redirect).toHaveBeenCalledWith(
      'https://github.com/login/oauth/authorize',
    );
  });

  it('rejects a GitHub callback with an invalid state before exchanging code', async () => {
    const controller = new AuthController(
      authService as never,
      configService as never,
    );
    const response = createResponse();

    await controller.githubCallback(
      createRequest(
        'vrompt_github_oauth_state=stored-state; vrompt_github_oauth_state_pkce=' +
          'v'.repeat(43),
      ),
      'oauth-code',
      'different-state',
      response as never,
    );

    expect(authService.exchangeGitHubCode).not.toHaveBeenCalled();
    expect(response.clearCookie).toHaveBeenCalledWith(
      'vrompt_github_oauth_state',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:3000/login?error=github_auth_failed',
    );
  });

  it('exchanges a valid GitHub callback and forwards the session cookie', async () => {
    const session = {
      refreshToken: 'refresh-token',
      refreshExpiresAt: new Date('2030-01-01T00:00:00.000Z'),
    };
    authService.exchangeGitHubCode.mockResolvedValue(session);
    const controller = new AuthController(
      authService as never,
      configService as never,
    );
    const response = createResponse();

    await controller.githubCallback(
      createRequest(
        'vrompt_github_oauth_state=stored-state; vrompt_github_oauth_state_pkce=' +
          'v'.repeat(43),
      ),
      'oauth-code',
      'stored-state',
      response as never,
    );

    expect(authService.exchangeGitHubCode).toHaveBeenCalledWith(
      'oauth-code',
      'v'.repeat(43),
    );
    expect(response.cookie).toHaveBeenCalledWith(
      'vrompt_refresh_token',
      'refresh-token',
      expect.objectContaining({ expires: session.refreshExpiresAt }),
    );
    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:3000/auth/callback',
    );
  });
});

function createRequest(cookie?: string) {
  return {
    headers: cookie ? { cookie } : {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as Request;
}

function createResponse() {
  return {
    clearCookie: jest.fn(),
    cookie: jest.fn(),
    redirect: jest.fn(),
  };
}
