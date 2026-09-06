import { ForbiddenException } from '@nestjs/common';
import { AuthOriginGuard } from './auth-origin.guard';

describe('authentication CSRF protection', () => {
  const guard = new AuthOriginGuard({
    get: () => 'https://vrompt.example',
  } as never);
  function context(headers: Record<string, string>, method = 'POST') {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ method, headers }),
        getResponse: () => ({ setHeader: jest.fn() }),
      }),
    } as never;
  }
  it('permits OAuth callback navigation', () =>
    expect(guard.canActivate(context({}, 'GET'))).toBe(true));
  it('permits a trusted frontend and explicit API client', () => {
    expect(
      guard.canActivate(
        context({ origin: 'https://vrompt.example', 'x-vrompt-client': 'web' }),
      ),
    ).toBe(true);
    expect(guard.canActivate(context({ 'x-vrompt-client': 'web' }))).toBe(true);
  });
  it.each([
    { origin: 'https://vrompt.example' },
    { origin: 'https://evil.example', 'x-vrompt-client': 'web' },
    { origin: 'null', 'x-vrompt-client': 'web' },
    { 'sec-fetch-site': 'cross-site', 'x-vrompt-client': 'web' },
    {
      origin: 'https://vrompt.example.attacker.test',
      'x-vrompt-client': 'web',
    },
  ])('rejects untrusted auth requests', (headers) => {
    expect(() =>
      guard.canActivate(context(headers as Record<string, string>)),
    ).toThrow(ForbiddenException);
  });
});
