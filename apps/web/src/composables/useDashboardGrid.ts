import { nextTick, onBeforeUnmount, readonly, ref, type Ref } from 'vue';
import {
  GridStack,
  type GridItemHTMLElement,
  type GridStackNode,
  type GridStackOptions,
} from 'gridstack';
import type { WidgetPosition } from '@shared/types';

const DEFAULT_CELL_HEIGHT_PX = 150;
const DEFAULT_MARGIN_PX = 20;
const DEFAULT_MOBILE_BREAKPOINT_PX = 768;

export interface DashboardGridItemState extends WidgetPosition {
  id: string;
}

export interface DashboardGridOptions {
  cellHeight?: number;
  margin?: number;
  mobileBreakpoint?: number;
  handle?: string;
}

type ChangeListener = (items: readonly DashboardGridItemState[]) => void;
type ResizeStopListener = (item: Readonly<DashboardGridItemState>) => void;
type GridNodeLike = Partial<Pick<GridStackNode, 'id' | 'x' | 'y' | 'w' | 'h'>>;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function compareByPosition(a: DashboardGridItemState, b: DashboardGridItemState): number {
  if (a.y !== b.y) {
    return a.y - b.y;
  }

  return a.x - b.x;
}

function cloneItem(item: DashboardGridItemState): DashboardGridItemState {
  return {
    id: item.id,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
  };
}

function toItemState(source: GridNodeLike): DashboardGridItemState | null {
  if (
    typeof source.id !== 'string' ||
    !isFiniteNumber(source.x) ||
    !isFiniteNumber(source.y) ||
    !isFiniteNumber(source.w) ||
    !isFiniteNumber(source.h)
  ) {
    return null;
  }

  return {
    id: source.id,
    x: source.x,
    y: source.y,
    w: source.w,
    h: source.h,
  };
}

function readNumberAttribute(
  element: HTMLElement,
  attr: 'gs-x' | 'gs-y' | 'gs-w' | 'gs-h',
): number | null {
  const value = element.getAttribute(attr);
  if (value === null) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isRegisteredWidget(element: HTMLElement): element is GridItemHTMLElement {
  return 'gridstackNode' in element && element.gridstackNode != null;
}

function readChangedItems(nodes: readonly GridNodeLike[]): DashboardGridItemState[] {
  const items: DashboardGridItemState[] = [];

  for (const node of nodes) {
    const item = toItemState(node);
    if (!item) {
      console.warn('[useDashboardGrid] Widget invalide ignoré dans change.', node);
      continue;
    }

    items.push(item);
  }

  return items.sort(compareByPosition);
}

function readItemStateFromElement(element: HTMLElement): DashboardGridItemState | null {
  const node = isRegisteredWidget(element) ? (element.gridstackNode ?? {}) : {};

  const item = toItemState({
    id: typeof node.id === 'string' ? node.id : (element.getAttribute('gs-id') ?? undefined),
    x: isFiniteNumber(node.x) ? node.x : (readNumberAttribute(element, 'gs-x') ?? undefined),
    y: isFiniteNumber(node.y) ? node.y : (readNumberAttribute(element, 'gs-y') ?? undefined),
    w: isFiniteNumber(node.w) ? node.w : (readNumberAttribute(element, 'gs-w') ?? undefined),
    h: isFiniteNumber(node.h) ? node.h : (readNumberAttribute(element, 'gs-h') ?? undefined),
  });

  if (!item) {
    console.warn(
      '[useDashboardGrid] Impossible de lire un widget rendu depuis le DOM/Gridstack.',
      element,
    );
  }

  return item;
}

function readAllItemsFromRenderedDom(container: HTMLElement): DashboardGridItemState[] | null {
  const elements = container.querySelectorAll<HTMLElement>(':scope > .grid-stack-item');
  const items: DashboardGridItemState[] = [];

  for (const element of elements) {
    const item = readItemStateFromElement(element);
    if (!item) {
      return null;
    }

    items.push(item);
  }

  return items.sort(compareByPosition);
}

type GridStackNodeWithElement = GridStackNode & {
  el?: HTMLElement | null;
};

type GridStackWithEngine = GridStack & {
  engine?: {
    nodes?: GridStackNodeWithElement[];
  };
};

function getRenderedGridItems(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(':scope > .grid-stack-item'));
}

function getRegisteredGridNodes(instance: GridStack): GridStackNodeWithElement[] {
  const gridWithEngine = instance as GridStackWithEngine;
  return gridWithEngine.engine?.nodes ?? [];
}

function hasNodeElement(node: GridStackNodeWithElement): node is GridStackNodeWithElement & {
  el: HTMLElement;
} {
  return node.el instanceof HTMLElement;
}

function buildGridStackOptions(options: DashboardGridOptions): GridStackOptions {
  const gsOptions: GridStackOptions = {
    column: 12,
    float: false,
    animate: true,
    cellHeight: options.cellHeight ?? DEFAULT_CELL_HEIGHT_PX,
    margin: DEFAULT_MARGIN_PX,
    columnOpts: {
      breakpointForWindow: true,
      breakpoints: [{ w: options.mobileBreakpoint ?? DEFAULT_MOBILE_BREAKPOINT_PX, c: 1 }],
    },
  };

  if (options.handle) {
    gsOptions.handle = options.handle;
  }

  return gsOptions;
}

/**
 * Wrapper technique de Gridstack pour Vue 3.
 *
 * Pattern Vue-first + makeWidget() :
 * - Vue rend les éléments .grid-stack-item via v-for
 * - Gridstack transforme les éléments existants via makeWidget()
 * - currentItems est relu depuis le DOM rendu / gridstackNode
 *
 * Le composable ne connaît pas le domaine dashboard.
 */
export function useDashboardGrid(
  containerRef: Ref<HTMLElement | null>,
  options: DashboardGridOptions = {},
) {
  let grid: GridStack | null = null;
  let isSynchronizing = false;

  const isReadyState = ref(false);
  const currentItemsState = ref<DashboardGridItemState[]>([]);

  const changeListeners = new Set<ChangeListener>();
  const resizeStopListeners = new Set<ResizeStopListener>();

  function notifyChangeListeners(items: DashboardGridItemState[]): void {
    const snapshot = items.map(cloneItem);

    for (const listener of changeListeners) {
      listener(snapshot);
    }
  }

  function notifyResizeStopListeners(item: DashboardGridItemState): void {
    const snapshot = cloneItem(item);

    for (const listener of resizeStopListeners) {
      listener(snapshot);
    }
  }

  function refreshCurrentItems(container: HTMLElement): DashboardGridItemState[] | null {
    const items = readAllItemsFromRenderedDom(container);

    if (items === null) {
      console.warn(
        "[useDashboardGrid] Impossible de rafraîchir l'état courant : lecture DOM/Gridstack incomplète.",
      );
      return null;
    }

    currentItemsState.value = items;
    return items;
  }

  function syncRenderedItemsWithInstance(instance: GridStack, container: HTMLElement): void {
    const renderedElements = getRenderedGridItems(container);
    const renderedIds = new Set(
      renderedElements
        .map((element) => element.getAttribute('gs-id'))
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    );

    isSynchronizing = true;
    instance.batchUpdate(true);

    try {
      for (const node of getRegisteredGridNodes(instance)) {
        if (typeof node.id !== 'string') {
          continue;
        }

        if (renderedIds.has(node.id)) {
          continue;
        }

        if (!hasNodeElement(node)) {
          console.warn(
            '[useDashboardGrid] Impossible de désenregistrer un widget supprimé : élément introuvable.',
            node,
          );
          continue;
        }

        instance.removeWidget(node.el, false, false);
      }

      for (const element of renderedElements) {
        if (isRegisteredWidget(element)) {
          continue;
        }

        instance.makeWidget(element);
      }
    } finally {
      instance.batchUpdate(false);
      isSynchronizing = false;
    }
  }

  function bindEvents(instance: GridStack): void {
    instance.on('change', (_event, nodes: GridStackNode[]) => {
      if (grid !== instance) return;
      if (isSynchronizing || instance.isIgnoreChangeCB()) return;

      const container = containerRef.value;
      if (!container) {
        console.warn('[useDashboardGrid] Impossible de traiter change : conteneur introuvable.');
        return;
      }

      const refreshedItems = refreshCurrentItems(container);
      if (refreshedItems === null) {
        console.warn(
          "[useDashboardGrid] Changement ignoré : l'état complet courant de la grille n'a pas pu être relu.",
        );
        return;
      }

      const changedItems = readChangedItems(nodes);
      if (changedItems.length === 0) return;

      notifyChangeListeners(changedItems);
    });

    instance.on('resizestop', (_event: Event, element: GridItemHTMLElement) => {
      if (grid !== instance) return;

      const item = readItemStateFromElement(element);
      if (!item) return;

      notifyResizeStopListeners(item);
    });
  }

  async function init(): Promise<void> {
    if (grid) {
      console.warn('[useDashboardGrid] Grille déjà initialisée.');
      return;
    }

    const container = containerRef.value;
    if (!container) {
      throw new Error(
        "[useDashboardGrid] Impossible d'initialiser : conteneur introuvable. " +
          'Vérifiez que le ref est bindé et que init() est appelé après le rendu du template.',
      );
    }

    await nextTick();

    const instance = GridStack.init(buildGridStackOptions(options), container);
    grid = instance;

    syncRenderedItemsWithInstance(instance, container);
    refreshCurrentItems(container);
    bindEvents(instance);

    isReadyState.value = true;
  }

  async function syncRenderedItems(): Promise<void> {
    if (!grid) {
      console.warn(
        "[useDashboardGrid] Impossible de synchroniser les widgets rendus : la grille n'est pas initialisée.",
      );
      return;
    }

    const container = containerRef.value;
    if (!container) {
      console.warn(
        '[useDashboardGrid] Impossible de synchroniser les widgets rendus : conteneur introuvable.',
      );
      return;
    }

    await nextTick();

    const instance = grid;
    if (!instance) {
      console.warn(
        "[useDashboardGrid] Impossible de synchroniser les widgets rendus : la grille n'est plus disponible.",
      );
      return;
    }

    syncRenderedItemsWithInstance(instance, container);
    refreshCurrentItems(container);
  }

  function destroy(): void {
    if (!grid) return;

    const instance = grid;

    grid = null;
    isSynchronizing = false;
    isReadyState.value = false;
    currentItemsState.value = [];
    changeListeners.clear();
    resizeStopListeners.clear();

    instance.off('change');
    instance.off('resizestop');
    instance.destroy(false);
  }

  function onChange(listener: ChangeListener): () => void {
    changeListeners.add(listener);

    return () => {
      changeListeners.delete(listener);
    };
  }

  function onResizeStop(listener: ResizeStopListener): () => void {
    resizeStopListeners.add(listener);

    return () => {
      resizeStopListeners.delete(listener);
    };
  }

  onBeforeUnmount(() => {
    destroy();
  });

  return {
    isReady: readonly(isReadyState),
    currentItems: readonly(currentItemsState),
    init,
    destroy,
    syncRenderedItems,
    onChange,
    onResizeStop,
  };
}
