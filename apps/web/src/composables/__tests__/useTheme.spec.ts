import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockMediaQueryList = {
  matches: boolean;
  media: string;
  onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null;
  addEventListener: (type: string, listener: (e: MediaQueryListEvent) => void) => void;
  removeEventListener: (type: string, listener: (e: MediaQueryListEvent) => void) => void;
  addListener: (listener: (e: MediaQueryListEvent) => void) => void;
  removeListener: (listener: (e: MediaQueryListEvent) => void) => void;
  dispatch: (value: boolean) => void;
};

function createMockMatchMedia(initialMatches = false) {
  let currentMatches = initialMatches;
  const listeners = new Set<(e: MediaQueryListEvent) => void>();

  const mediaQueryList: MockMediaQueryList = {
    get matches() {
      return currentMatches;
    },
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: (_type, listener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type, listener) => {
      listeners.delete(listener);
    },
    addListener: (listener) => {
      listeners.add(listener);
    },
    removeListener: (listener) => {
      listeners.delete(listener);
    },
    dispatch(value: boolean) {
      currentMatches = value;

      const event = {
        matches: value,
        media: mediaQueryList.media,
      } as MediaQueryListEvent;

      for (const listener of listeners) {
        listener(event);
      }

      mediaQueryList.onchange?.call(mediaQueryList as unknown as MediaQueryList, event);
    },
  };

  const matchMediaMock = vi.fn().mockImplementation(() => mediaQueryList);

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: matchMediaMock,
  });

  return {
    matchMediaMock,
    mediaQueryList,
  };
}

describe('useTheme', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.className = '';
  });

  async function loadUseTheme() {
    return import('../useTheme');
  }

  it('initTheme() loads preference from localStorage', async () => {
    createMockMatchMedia(false);
    localStorage.setItem('themePreference', 'dark');

    const { useTheme } = await loadUseTheme();
    const theme = useTheme();
    theme.initTheme();

    expect(theme.preference.value).toBe('dark');
    expect(theme.effectiveTheme.value).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('falls back to system when stored preference is invalid', async () => {
    createMockMatchMedia(false);
    localStorage.setItem('themePreference', 'invalid-value');

    const { useTheme } = await loadUseTheme();
    const theme = useTheme();
    theme.initTheme();

    expect(theme.preference.value).toBe('system');
  });

  it('effectiveTheme follows system preference when system is dark', async () => {
    createMockMatchMedia(true);

    const { useTheme } = await loadUseTheme();
    const theme = useTheme();
    theme.initTheme();

    expect(theme.preference.value).toBe('system');
    expect(theme.effectiveTheme.value).toBe('dark');
    expect(theme.isDark.value).toBe(true);
  });

  it('setPreference() saves preference and applies DOM class', async () => {
    createMockMatchMedia(false);

    const { useTheme } = await loadUseTheme();
    const theme = useTheme();
    theme.initTheme();

    theme.setPreference('dark');

    expect(localStorage.getItem('themePreference')).toBe('dark');
    expect(theme.preference.value).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggleTheme() switches between light and dark', async () => {
    createMockMatchMedia(false);

    const { useTheme } = await loadUseTheme();
    const theme = useTheme();
    theme.initTheme();

    theme.setTheme('light');
    expect(theme.isDark.value).toBe(false);

    theme.toggleTheme();
    expect(theme.isDark.value).toBe(true);

    theme.toggleTheme();
    expect(theme.isDark.value).toBe(false);
  });

  it('attaches system listener only once', async () => {
    const { matchMediaMock } = createMockMatchMedia(false);

    const { useTheme } = await loadUseTheme();
    const theme = useTheme();

    theme.initTheme();
    theme.initTheme();

    expect(matchMediaMock).toHaveBeenCalledTimes(2);
    expect(theme.isInitialized.value).toBe(true);
  });
});
