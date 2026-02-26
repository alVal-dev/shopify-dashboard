import type { AxiosInstance } from 'axios';
import type { Router } from 'vue-router';
import { createApiClient } from './apiClient';

let _api: AxiosInstance | null = null;

export function initApiClient(router: Router): AxiosInstance {
  if (_api) return _api;

  _api = createApiClient({ router });
  return _api;
}

export function api(): AxiosInstance {
  if (!_api) {
    throw new Error(
      'API client not initialized. Call initApiClient(router) in main.ts before using api().',
    );
  }
  return _api;
}