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
        <div class="widget-title">
          <i v-if="icon" :class="icon" class="widget-icon" />
          <span>{{ title }}</span>
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
}

.widget-wrapper :deep(.p-card-body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.widget-wrapper :deep(.p-card-header) {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--p-surface-border);
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

.widget-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.95rem;
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
}

.widget-skeleton {
  width: 100%;
  height: 100%;
  min-height: 120px;
}
</style>
