export interface ApiHealthResponse {
  status: 'ok' | 'degraded';
  service: 'api';
  version: 'v1';
  timestamp: string;
  dependencies: {
    postgres: 'up' | 'down';
    redis: 'up' | 'down';
  };
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface ProfileRepository {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  updatedAt: string;
}

export interface ProfileCollection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  updatedAt: string;
  _count: { items: number };
}

export interface ProfileResponse {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatar: string | null;
  website: string | null;
  createdAt: string;
  stats: {
    repositories: number;
    followers: number;
    following: number;
  };
  repositories: ProfileRepository[];
  collections: ProfileCollection[];
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function getApiBaseUrl() {
  return (
    process.env.INTERNAL_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    'http://localhost:4000/api/v1'
  );
}

export function getMediaUrl(url: string | null) {
  if (!url) {
    return null;
  }

  return new URL(url, getApiBaseUrl()).toString();
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { accessToken?: string } = {},
): Promise<T> {
  const { accessToken, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);

  if (
    requestOptions.body &&
    !(requestOptions.body instanceof FormData) &&
    !headers.has('content-type')
  ) {
    headers.set('content-type', 'application/json');
  }

  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...requestOptions,
    credentials: 'include',
    headers,
  });
  const body = (await response.json().catch(() => null)) as
    { message?: string | string[] } | T | null;

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body
        ? body.message
        : undefined;
    throw new ApiError(
      Array.isArray(message) ? message.join(', ') : message || 'Request failed',
      response.status,
    );
  }

  return body as T;
}

export async function fetchApiHealth(): Promise<ApiHealthResponse | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/health`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as ApiHealthResponse;
  } catch {
    return null;
  }
}
