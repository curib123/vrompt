const oauthReturnStorageKey = 'vrompt-oauth-return-to';

export function sanitizeReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  try {
    const parsed = new URL(value, 'https://vrompt.local');
    if (parsed.origin !== 'https://vrompt.local') return null;
    if (parsed.pathname.startsWith('/auth') || parsed.pathname === '/login') {
      return null;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function rememberOAuthReturnPath(value: string | null | undefined) {
  const path = sanitizeReturnPath(value);
  if (path && typeof window !== 'undefined') {
    window.sessionStorage.setItem(oauthReturnStorageKey, path);
  }
  return path;
}

export function getOAuthReturnPath() {
  if (typeof window === 'undefined') return null;
  return sanitizeReturnPath(
    window.sessionStorage.getItem(oauthReturnStorageKey),
  );
}

export function consumeOAuthReturnPath() {
  const path = getOAuthReturnPath();
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(oauthReturnStorageKey);
  }
  return path;
}
