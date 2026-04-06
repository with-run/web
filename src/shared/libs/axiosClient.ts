import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import type { ReissueAccessTokenResponse } from '@/apis/auth';
import { getApiBaseUrl } from '@/shared/config/api';
import type { ApiResponse } from '@/apis';
import { useAuthStore } from '@/stores/Auth';

type RetryableAxiosRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
};

function createBaseClient() {
  return axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 10000,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function shouldSkipRefresh(config?: RetryableAxiosRequestConfig): boolean {
  if (!config) {
    return true;
  }

  if (config.skipAuthRefresh) {
    return true;
  }

  const requestUrl = config.url ?? '';

  return (
    // code 교환 자체가 세션 복구 시작점이므로 여기서 다시 refresh 재시도를 걸면 루프가 생길 수 있습니다.
    requestUrl.includes('/auth/exchange') ||
    requestUrl.includes('/auth/reissue') ||
    requestUrl.includes('/auth/me') ||
    requestUrl.includes('/auth/logout')
  );
}

// TODO: 인증 시스템 구현 완료 후 활성화
// function redirectToLogin(): void {
//   if (typeof window === 'undefined') return;
//   if (window.location.pathname === '/login') return;
//   window.location.replace('/login');
// }

async function requestAccessTokenRefresh(): Promise<string> {
  // refresh token 은 HttpOnly cookie 에 있으므로 재발급 요청은 별도 헤더 없이 쿠키 기반으로만 보낸다.
  const { data } =
    await authApiClient.post<ApiResponse<ReissueAccessTokenResponse>>(
      '/auth/reissue'
    );

  const nextAccessToken = data.data.accessToken;
  useAuthStore.getState().setAccessToken(nextAccessToken);

  return nextAccessToken;
}

export const authApiClient = createBaseClient();

const axiosClient = createBaseClient();

let refreshPromise: Promise<string> | null = null;

axiosClient.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().accessToken;

    if (accessToken) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | RetryableAxiosRequestConfig
      | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      shouldSkipRefresh(originalRequest)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // 여러 요청이 동시에 401 이 나도 refresh 호출은 한 번만 수행하고 나머지는 같은 Promise 를 기다린다.
      refreshPromise ??= requestAccessTokenRefresh().finally(() => {
        refreshPromise = null;
      });

      const nextAccessToken = await refreshPromise;
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;

      return axiosClient(originalRequest);
    } catch (refreshError) {
      // TODO: 인증 시스템 구현 완료 후 활성화
      // if (!import.meta.env.DEV) {
      //   useAuthStore.getState().clearAuth();
      //   redirectToLogin();
      // }
      return Promise.reject(refreshError);
    }
  }
);

export default axiosClient;
