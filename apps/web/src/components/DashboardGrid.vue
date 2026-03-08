<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component } from 'vue';
import type { WidgetPosition } from '@shared/types';
import { useDashboardGrid, type DashboardGridItemState } from '../composables/useDashboardGrid';
import Button from 'primevue/button';

const GRIDSTACK_DRAG_HANDLE_SELECTOR = '.widget-drag-handle';

type WidgetListeners = Record<string, (...args: any[]) => void>;

export interface DashboardGridWidgetViewModel {
  id: string;
  title: string;
  position: WidgetPosition;
  minW: number;
  minH: number;
  component: Component | null;
  props: Record<string, unknown>;
  listeners?: WidgetListeners;
  className?: string;
}

interface Props {
  widgets: DashboardGridWidgetViewModel[];
}

interface LayoutChangePayload {
  changedItems: DashboardGridItemState[];
  currentItems: DashboardGridItemState[];
}

interface ResizeStopPayload {
  item: DashboardGridItemState;
}

const props = withDefaults(defineProps<Props>(), {
  widgets: () => [],
});

const emit = defineEmits<{
  'layout-change': [payload: LayoutChangePayload];
  'resize-stop': [payload: ResizeStopPayload];
  'remove-widget': [widgetId: string];
}>();

const containerRef = ref<HTMLElement | null>(null);

const { init, syncRenderedItems, onChange, onResizeStop, currentItems, isReady } = useDashboardGrid(
  containerRef,
  {
    handle: GRIDSTACK_DRAG_HANDLE_SELECTOR,
  },
);

const widgetIds = computed(() => props.widgets.map((widget) => widget.id));

function handleRemoveWidget(widgetId: string): void {
  emit('remove-widget', widgetId);
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

function cloneItems(items: readonly DashboardGridItemState[]): DashboardGridItemState[] {
  return items.map(cloneItem);
}

onChange((changedItems) => {
  emit('layout-change', {
    changedItems: cloneItems(changedItems),
    currentItems: cloneItems(currentItems.value),
  });
});

onResizeStop((item) => {
  emit('resize-stop', {
    item: cloneItem(item),
  });
});

watch(
  widgetIds,
  async (nextIds, previousIds) => {
    if (!isReady.value) {
      return;
    }

    const sameIds =
      nextIds.length === previousIds.length &&
      nextIds.every((id, index) => id === previousIds[index]);

    if (sameIds) {
      return;
    }

    await syncRenderedItems();
  },
  { flush: 'post' },
);

onMounted(async () => {
  await init();
});
</script>

<template>
  <div ref="containerRef" class="grid-stack dashboard-grid">
    <div
      v-for="widget in props.widgets"
      :key="widget.id"
      class="grid-stack-item dashboard-grid-item"
      :class="widget.className"
      :gs-id="widget.id"
      :gs-x="widget.position.x"
      :gs-y="widget.position.y"
      :gs-w="widget.position.w"
      :gs-h="widget.position.h"
      :gs-min-w="widget.minW"
      :gs-min-h="widget.minH"
    >
      <div class="grid-stack-item-content dashboard-grid-item-content">
        <div class="dashboard-grid-item-actions">
          <Button
            icon="pi pi-times"
            text
            rounded
            size="small"
            severity="secondary"
            aria-label="Supprimer ce widget"
            @mousedown.stop
            @click.stop="handleRemoveWidget(widget.id)"
          />
        </div>
        <component
          v-if="widget.component"
          :is="widget.component"
          v-bind="widget.props"
          v-on="widget.listeners ?? {}"
        />

        <div v-else class="unsupported-widget">
          <div class="unsupported-widget-title">{{ widget.title }}</div>
          <div class="unsupported-widget-text">
            Ce widget n'est pas encore disponible dans cette phase du tableau de bord.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-grid {
  width: 100%;
}

.dashboard-grid-item-content {
  display: flex;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: transparent;
}

.dashboard-grid-item-content > * {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.unsupported-widget {
  display: flex;
  height: 100%;
  width: 100%;
  flex-direction: column;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  border: 1px dashed var(--p-content-border-color);
  border-radius: 1rem;
  background: var(--p-surface-card);
}

.unsupported-widget-title {
  font-weight: 600;
}

.unsupported-widget-text {
  color: var(--p-text-muted-color);
}

.dashboard-grid-item-content {
  position: relative;
  display: flex;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: transparent;
}

.dashboard-grid-item-actions {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 3;
}
</style>
