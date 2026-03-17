import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useDashboardStore } from '../dashboard';
import type { DashboardLayout } from '@shared/types';

vi.mock('@/api/dashboard', () => ({
  getLayout: vi.fn(),
  saveLayout: vi.fn(),
}));

vi.mock('../orders', () => ({
  useOrdersStore: () => ({
    fetch: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn(),
    error: null,
  }),
}));

vi.mock('../analytics', () => ({
  useAnalyticsStore: () => ({
    fetch: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn(),
    error: null,
  }),
}));

import { getLayout, saveLayout } from '../../api/dashboard';

function makeLayout(): DashboardLayout {
  return {
    widgets: [
      {
        id: 'kpi-1',
        type: 'kpi-cards',
        title: 'Indicateurs clés',
        position: { x: 0, y: 0, w: 12, h: 2 },
      },
    ],
  };
}

describe('dashboard store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetchLayout() stores layout on success', async () => {
    vi.mocked(getLayout).mockResolvedValue(makeLayout());

    const store = useDashboardStore();
    await store.fetchLayout();

    expect(store.layout).toEqual(makeLayout());
    expect(store.layoutError).toBeNull();
  });

  it('fetchLayout() sets error on failure', async () => {
    vi.mocked(getLayout).mockRejectedValue(new Error('boom'));

    const store = useDashboardStore();
    await store.fetchLayout();

    expect(store.layout).toBeNull();
    expect(store.layoutError).toBe('Impossible de charger la disposition du tableau de bord.');
  });

  it('load() orchestrates layout fetch and marks store as ready', async () => {
    vi.mocked(getLayout).mockResolvedValue(makeLayout());

    const store = useDashboardStore();
    await store.load();

    expect(store.layout).toEqual(makeLayout());
    expect(store.isLoading).toBe(false);
    expect(store.hasLayout).toBe(true);
  });

  it('addWidget() adds missing widget to loaded layout', () => {
    const store = useDashboardStore();
    store.layout = makeLayout();

    const widget = store.addWidget('top-products');

    expect(widget).not.toBeNull();
    expect(store.layout?.widgets.some((w) => w.type === 'top-products')).toBe(true);
  });

  it('addWidget() refuses duplicate widget type', () => {
    const store = useDashboardStore();
    store.layout = makeLayout();

    const widget = store.addWidget('kpi-cards');

    expect(widget).toBeNull();
    expect(store.layout?.widgets).toHaveLength(1);
  });

  it('addWidget() returns null when layout is not loaded', () => {
    const store = useDashboardStore();

    expect(store.addWidget('top-products')).toBeNull();
  });

  it('applyGridLayout() updates widget positions', () => {
    const store = useDashboardStore();
    store.layout = makeLayout();

    const result = store.applyGridLayout([
      {
        id: 'kpi-1',
        x: 2,
        y: 3,
        w: 6,
        h: 4,
      },
    ]);

    expect(result.widgets[0]?.position).toEqual({
      x: 2,
      y: 3,
      w: 6,
      h: 4,
    });
  });

  it('applyGridLayout() throws when layout is not loaded', () => {
    const store = useDashboardStore();

    expect(() =>
      store.applyGridLayout([
        {
          id: 'kpi-1',
          x: 0,
          y: 0,
          w: 1,
          h: 1,
        },
      ]),
    ).toThrow();
  });

  it('persistLayout() saves layout remotely on success', async () => {
    vi.mocked(saveLayout).mockResolvedValue(makeLayout());

    const store = useDashboardStore();
    store.layout = makeLayout();

    const result = await store.persistLayout();

    expect(result).toEqual(makeLayout());
    expect(store.saveLayoutError).toBeNull();
  });

  it('persistLayout() sets error on failure', async () => {
    vi.mocked(saveLayout).mockRejectedValue(new Error('boom'));

    const store = useDashboardStore();
    store.layout = makeLayout();

    const result = await store.persistLayout();

    expect(result).toBeNull();
    expect(store.saveLayoutError).toBe(
      "Impossible d'enregistrer la disposition du tableau de bord.",
    );
  });

  it('applyGridLayoutAndPersist() returns true without remote persist when disabled', async () => {
    const store = useDashboardStore();
    store.layout = makeLayout();

    const ok = await store.applyGridLayoutAndPersist(
      [
        {
          id: 'kpi-1',
          x: 1,
          y: 1,
          w: 4,
          h: 2,
        },
      ],
      { persistRemotely: false },
    );

    expect(ok).toBe(true);
  });

  it('removeWidget() removes existing widget and returns it', () => {
    const store = useDashboardStore();
    store.layout = makeLayout();

    const removed = store.removeWidget('kpi-1');

    expect(removed?.id).toBe('kpi-1');
    expect(store.layout?.widgets).toHaveLength(0);
  });

  it('removeWidget() returns null for unknown widget', () => {
    const store = useDashboardStore();
    store.layout = makeLayout();

    expect(store.removeWidget('missing')).toBeNull();
  });

  it('reset() clears dashboard state', () => {
    const store = useDashboardStore();
    store.layout = makeLayout();
    store.layoutError = 'err';
    store.saveLayoutError = 'save err';
    store.isLoading = true;
    store.isLayoutLoading = true;
    store.isSavingLayout = true;

    store.reset();

    expect(store.layout).toBeNull();
    expect(store.layoutError).toBeNull();
    expect(store.saveLayoutError).toBeNull();
    expect(store.isLoading).toBe(false);
    expect(store.isLayoutLoading).toBe(false);
    expect(store.isSavingLayout).toBe(false);
  });
});
