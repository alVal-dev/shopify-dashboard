import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useAuthStore } from '../auth';

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock('@/api', () => ({
  api: () => ({
    get: getMock,
    post: postMock,
  }),
}));

const ordersReset = vi.fn();
const analyticsReset = vi.fn();
const dashboardReset = vi.fn();

vi.mock('../orders', () => ({
  useOrdersStore: () => ({
    reset: ordersReset,
  }),
}));

vi.mock('../analytics', () => ({
  useAnalyticsStore: () => ({
    reset: analyticsReset,
  }),
}));

vi.mock('../dashboard', () => ({
  useDashboardStore: () => ({
    reset: dashboardReset,
  }),
}));

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('checkAuth() stores user on success and initializes store', async () => {
    getMock.mockResolvedValue({
      data: {
        data: {
          id: 'u1',
          email: 'john@example.com',
          role: 'user',
        },
      },
    });

    const store = useAuthStore();
    await store.checkAuth();

    expect(store.user).toEqual({
      id: 'u1',
      email: 'john@example.com',
      role: 'user',
    });
    expect(store.isInitialized).toBe(true);
    expect(store.isAuthenticated).toBe(true);
  });

  it('checkAuth() clears user on failure and initializes store', async () => {
    getMock.mockRejectedValue(new Error('401'));

    const store = useAuthStore();
    await store.checkAuth();

    expect(store.user).toBeNull();
    expect(store.isInitialized).toBe(true);
    expect(store.isAuthenticated).toBe(false);
  });

  it('loginDemo() stores demo user on success', async () => {
    postMock.mockResolvedValue({
      data: {
        data: {
          id: 'demo-1',
          email: 'demo@shopify-dashboard.com',
          role: 'demo',
        },
      },
    });

    const store = useAuthStore();
    await store.loginDemo();

    expect(store.user?.role).toBe('demo');
    expect(store.error).toBeNull();
    expect(store.isLoading).toBe(false);
  });

  it('loginDemo() sets friendly error and rethrows on failure', async () => {
    postMock.mockRejectedValue(new Error('boom'));

    const store = useAuthStore();

    await expect(store.loginDemo()).rejects.toThrow('boom');
    expect(store.user).toBeNull();
    expect(store.error).toBe('Unable to login as demo user.');
    expect(store.isLoading).toBe(false);
  });

  it('loginWithCredentials() stores standard user on success', async () => {
    postMock.mockResolvedValue({
      data: {
        data: {
          id: 'u1',
          email: 'john@example.com',
          role: 'user',
        },
      },
    });

    const store = useAuthStore();
    await store.loginWithCredentials('john@example.com', 'password123');

    expect(store.user?.email).toBe('john@example.com');
    expect(store.error).toBeNull();
    expect(store.isLoading).toBe(false);
  });

  it('loginWithCredentials() sets friendly error and rethrows on failure', async () => {
    postMock.mockRejectedValue(new Error('boom'));

    const store = useAuthStore();

    await expect(store.loginWithCredentials('john@example.com', 'wrong')).rejects.toThrow('boom');
    expect(store.user).toBeNull();
    expect(store.error).toBe('Invalid email or password.');
    expect(store.isLoading).toBe(false);
  });

  it('logout() resets local auth and dependent stores even if api call fails', async () => {
    postMock.mockRejectedValue(new Error('server down'));

    const store = useAuthStore();
    store.user = {
      id: 'u1',
      email: 'john@example.com',
      role: 'user',
    };

    await store.logout();

    expect(store.user).toBeNull();
    expect(ordersReset).toHaveBeenCalledTimes(1);
    expect(analyticsReset).toHaveBeenCalledTimes(1);
    expect(dashboardReset).toHaveBeenCalledTimes(1);
  });
});
