function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function getWindowOrigin(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.origin;
}

function joinUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!baseUrl) {
    return normalizedPath;
  }

  return `${baseUrl}${normalizedPath}`;
}

// VITE_API_BASE_URL 이 /api 를 포함하든 말든, 서버 URL 과 API URL 을 둘 다 안정적으로 계산한다.
const rawBaseUrl = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL ?? getWindowOrigin()
);

const serverBaseUrl = rawBaseUrl.endsWith('/api')
  ? rawBaseUrl.slice(0, -4)
  : rawBaseUrl;

const apiBaseUrl = rawBaseUrl.endsWith('/api')
  ? rawBaseUrl
  : joinUrl(serverBaseUrl, '/api');

export function getServerBaseUrl(): string {
  return serverBaseUrl;
}

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

export function buildServerUrl(path: string): string {
  return joinUrl(serverBaseUrl, path);
}
