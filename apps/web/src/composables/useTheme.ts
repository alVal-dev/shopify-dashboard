import { computed, ref } from 'vue';

export type ThemePreference = 'system' | 'light' | 'dark';
export type EffectiveTheme = 'light' | 'dark';

const STORAGE_KEY = 'themePreference';

// Singleton
const preference = ref<ThemePreference>('system');
const isInitialized = ref(false);

let mediaQuery: MediaQueryList | null = null;
let systemListener: ((e: MediaQueryListEvent) => void) | null = null;

function getSystemTheme(): EffectiveTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const effectiveTheme = computed<EffectiveTheme>(() =>
  preference.value === 'system' ? getSystemTheme() : preference.value,
);

const isDark = computed(() => effectiveTheme.value === 'dark');

function applyToDom(theme: EffectiveTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

function applyCurrentTheme(): void {
  applyToDom(effectiveTheme.value);
}

function loadPreferenceFromStorage(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
}

function savePreferenceToStorage(value: ThemePreference): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, value);
}

function attachSystemListenerOnce(): void {
  if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return;
  if (mediaQuery) return;

  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  systemListener = () => {
    if (preference.value !== 'system') return;
    applyCurrentTheme();
  };

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', systemListener);
  } else if (typeof (mediaQuery as any).addListener === 'function') {
    (mediaQuery as any).addListener(systemListener);
  }
}

function initTheme(): void {
  if (isInitialized.value) return;

  preference.value = loadPreferenceFromStorage();
  applyCurrentTheme();
  attachSystemListenerOnce();

  isInitialized.value = true;
}

function setPreference(value: ThemePreference): void {
  preference.value = value;
  savePreferenceToStorage(value);
  applyCurrentTheme();
}

function setTheme(value: EffectiveTheme): void {
  setPreference(value);
}

function toggleTheme(): void {
  setTheme(isDark.value ? 'light' : 'dark');
}

export function useTheme() {
  return {
    // state
    preference,
    effectiveTheme,
    isDark,
    isInitialized,
    // actions
    initTheme,
    setPreference,
    setTheme,
    toggleTheme,
  };
}
