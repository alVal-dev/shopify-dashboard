import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { AuthUser } from '@shared/types';
import { api } from '../api';

type AuthResponse = { data: AuthUser };
type LogoutResponse = { data: { ok: true } };

export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  const user = ref<AuthUser | null>(null);
  const isInitialized = ref(false);

  // UI state (pour la page login)
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // --- Getters ---
  const isAuthenticated = computed(() => user.value !== null);
  const isDemo = computed(() => user.value?.role === 'demo');

  // --- Actions ---

  async function checkAuth(): Promise<void> {
    error.value = null;

    try {
      const res = await api().get<AuthResponse>('/auth/me', { silent401: true });
      user.value = res.data.data;
    } catch {
      user.value = null;
    } finally {
      isInitialized.value = true;
    }
  }

  async function loginDemo(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      const res = await api().post<AuthResponse>('/auth/demo');
      user.value = res.data.data;
    } catch (e) {
      user.value = null;
      error.value = 'Unable to login as demo user.';
      throw e;
    } finally {
      isLoading.value = false;
    }
  }

  async function loginWithCredentials(email: string, password: string): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      const res = await api().post<AuthResponse>('/auth/login', { email, password });
      user.value = res.data.data;
    } catch (e) {
      user.value = null;
      error.value = 'Invalid email or password.';
      throw e;
    } finally {
      isLoading.value = false;
    }
  }

  async function logout(): Promise<void> {
    error.value = null;

    try {
      await api().post<LogoutResponse>('/auth/logout');
    } catch {
      // best-effort: même si le serveur échoue, on reset le state local
    } finally {
      user.value = null;
    }
  }

  return {
    // state
    user,
    isInitialized,
    isLoading,
    error,

    // getters
    isAuthenticated,
    isDemo,

    // actions
    checkAuth,
    loginDemo,
    loginWithCredentials,
    logout,
  };
});