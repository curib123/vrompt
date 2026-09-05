export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  accountType: 'REAL' | 'STARTER' | 'OFFICIAL';
  plan: 'FREE' | 'PRO';
  onboardingCompleted: boolean;
}
export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export function getApiBaseUrl() {
  if (typeof window !== 'undefined')
    return (
      process.env.NEXT_PUBLIC_API_BASE_URL ?? `${window.location.origin}/api/v1`
    );
  return (
    process.env.INTERNAL_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    'http://localhost:4000/api/v1'
  );
}
export async function apiRequest<T>(
  path: string,
  options: RequestInit & { accessToken?: string } = {},
): Promise<T> {
  const { accessToken, ...init } = options;
  const headers = new Headers(init.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body && !(init.body instanceof FormData))
    headers.set('Content-Type', 'application/json');
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      Array.isArray(body?.message)
        ? body.message.join(', ')
        : (body?.message ?? 'Request failed. Please try again.'),
      response.status,
    );
  return body as T;
}
export type Model = {
  id: string;
  provider: string;
  displayName: string;
  description: string;
  capabilities: string[];
  enabled?: boolean;
  maintenance?: boolean;
};
export type Conversation = { id: string; title: string; updatedAt: string };
export type Message = {
  artifacts?: ChatFile[];
  id: string;
  role: string;
  content: string;
  modelName?: string;
  routingMode?: string;
  status: string;
};
export type ChatFile = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
};
export type SavedPrompt = { id: string; title: string; content: string };
export type Usage = {
  plan: string;
  resets: { daily: string; monthly: string };
  allowances: {
    bucket: string;
    allowedFeatures: string[];
    dailyRemaining: number;
    monthlyRemaining: number;
    dailyLimit: number;
    monthlyLimit: number;
    maxFiles: number;
    maxFileBytes: number;
  }[];
};
