import axios, { AxiosError, type AxiosInstance } from 'axios';
import type { Router } from 'vue-router';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /**
     * Si true, un 401 ne déclenche pas de redirection vers /login.
     * Utile pour des calls comme GET /auth/me (check auth au boot).
     */
    silent401?: boolean;
  }
}

type ApiClientOptions = {
  router: Router;
};

export function createApiClient({ router }: ApiClientOptions): AxiosInstance {
  const client = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      if (!axios.isAxiosError(error)) {
        return Promise.reject(error);
      }

      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const silent401 = axiosError.config?.silent401 === true;

      if (status === 401 && !silent401) {
        const currentPath = router.currentRoute.value.fullPath;
        // Evite redirect loop / pollution historique
        if (!currentPath.startsWith('/login')) {
          await router.replace({ path: '/login' });
        }
      }

      return Promise.reject(axiosError);
    },
  );

  return client;
}
