import {
  consumeOAuthReturnPath,
  rememberOAuthReturnPath,
  sanitizeReturnPath,
} from '@/lib/auth-return';

describe('OAuth return paths', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('preserves a safe public prompt path through OAuth', () => {
    const path = '/prompts/repository-id/writing-helper?intent=save';
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
