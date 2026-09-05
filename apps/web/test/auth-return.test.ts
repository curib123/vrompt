import {
  consumeOAuthReturnPath,
  rememberOAuthReturnPath,
  sanitizeReturnPath,
} from '@/lib/auth-return';

describe('OAuth return paths', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('preserves a safe workspace path through OAuth', () => {
    const path = '/chat?conversation=workspace-id';
    expect(rememberOAuthReturnPath(path)).toBe(path);
    expect(consumeOAuthReturnPath()).toBe(path);
    expect(consumeOAuthReturnPath()).toBeNull();
  });

  it('rejects external and auth-loop destinations', () => {
    expect(sanitizeReturnPath('//evil.example/path')).toBeNull();
    expect(sanitizeReturnPath('https://evil.example/path')).toBeNull();
    expect(sanitizeReturnPath('/auth/callback')).toBeNull();
    expect(sanitizeReturnPath('/login')).toBeNull();
  });
});
