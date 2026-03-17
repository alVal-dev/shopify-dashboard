<script setup lang="ts">
import { computed } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Skeleton from 'primevue/skeleton';

interface Props {
  title: string;
  icon?: string;
  loading?: boolean;
  scrollable?: boolean;
  actionIcon?: string;
  actionLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  icon: undefined,
  loading: false,
  scrollable: false,
  actionIcon: undefined,
  actionLabel: undefined,
});

const emit = defineEmits<{
  action: [];
}>();

const hasAction = computed(() => !!props.actionIcon || !!props.actionLabel);

const contentClass = computed(() => ({
  'widget-content': true,
  'widget-content--scrollable': props.scrollable,
}));
</script>

<template>
  <Card class="widget-wrapper">
    <template #header>
      <div class="widget-header">
        <div class="widget-header-start">
          <div class="widget-drag-handle" aria-hidden="true" title="Déplacer le widget">
            <span class="widget-drag-handle-dots" />
          </div>

          <div class="widget-title">
            <i v-if="icon" :class="icon" class="widget-icon" />
            <span>{{ title }}</span>
          </div>
        </div>

        <Button
          v-if="hasAction"
          :icon="actionIcon"
          :label="actionLabel"
          text
          size="small"
          severity="secondary"
          @click="emit('action')"
        />
      </div>
    </template>

    <template #content>
      <div :class="contentClass">
        <template v-if="loading">
          <Skeleton class="widget-skeleton" />
        </template>

        <template v-else>
          <slot />
        </template>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.widget-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--p-surface-border);
  box-shadow:
    0 1px 3px 0 rgb(0 0 0 / 0.05),
    0 1px 2px -1px rgb(0 0 0 / 0.05);
}

.widget-wrapper :deep(.p-card-body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  min-height: 0;
}

.widget-wrapper :deep(.p-card-header) {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-border);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--p-surface-card);
}

.widget-wrapper :deep(.p-card-content) {
  flex: 1;
  padding: 1rem;
  min-height: 0;
}

.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.widget-header-start {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.widget-drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border-radius: 0.5rem;
  border: 1px solid var(--p-surface-border);
  background: var(--p-surface-ground);
  color: var(--p-text-muted-color);
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.widget-drag-handle:active {
  cursor: grabbing;
}

.widget-drag-handle-dots {
  width: 0.2rem;
  height: 0.2rem;
  border-radius: 999px;
  background: currentColor;
  box-shadow:
    0 0.4rem 0 currentColor,
    0 0.8rem 0 currentColor,
    0.4rem 0 0 currentColor,
    0.4rem 0.4rem 0 currentColor,
    0.4rem 0.8rem 0 currentColor;
}

.widget-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  font-weight: 600;
  font-size: 0.95rem;
}

.widget-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.widget-icon {
  color: var(--p-primary-color);
}

.widget-content {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.widget-content--scrollable {
  overflow: auto;
  height: 100%;
}

.widget-skeleton {
  width: 100%;
  height: 100%;
  min-height: 120px;
}
</style>
