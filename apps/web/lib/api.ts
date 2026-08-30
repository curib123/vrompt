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

function getApiBaseUrl() {
  return (
    process.env.INTERNAL_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    'http://localhost:4000/api/v1'
  );
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
