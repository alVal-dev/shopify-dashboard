<script setup lang="ts">
import type { WidgetType } from '@shared/types';

interface WidgetCatalogItem {
  type: WidgetType;
  title: string;
  description: string;
  icon: string;
}

interface Props {
  items: WidgetCatalogItem[];
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
});

const emit = defineEmits<{
  'add-widget': [type: WidgetType];
}>();

function handleAddWidget(type: WidgetType): void {
  emit('add-widget', type);
}
</script>

<template>
  <section class="widget-catalog">
    <header class="widget-catalog-header">
      <h2 class="widget-catalog-title">Ajouter un widget</h2>
      <p class="widget-catalog-description">
        Sélectionne un widget disponible pour l’ajouter immédiatement au tableau de bord.
      </p>
    </header>

    <div v-if="props.items.length === 0" class="widget-catalog-empty">
      <i class="pi pi-check-circle" />
      <span>Tous les widgets disponibles sont déjà présents dans le dashboard.</span>
    </div>

    <div v-else class="widget-catalog-list">
      <button
        v-for="item in props.items"
        :key="item.type"
        type="button"
        class="widget-catalog-item"
        @click="handleAddWidget(item.type)"
      >
        <div class="widget-catalog-item-main">
          <div class="widget-catalog-item-icon">
            <i :class="item.icon" />
          </div>

          <div class="widget-catalog-item-text">
            <div class="widget-catalog-item-title">{{ item.title }}</div>
            <div class="widget-catalog-item-description">{{ item.description }}</div>
          </div>
        </div>

        <div class="widget-catalog-item-action">
          <i class="pi pi-plus" />
        </div>
      </button>
    </div>
  </section>
</template>

<style scoped>
.widget-catalog {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.widget-catalog-header {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.widget-catalog-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.widget-catalog-description {
  margin: 0;
  color: var(--p-text-muted-color);
  line-height: 1.5;
}

.widget-catalog-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.widget-catalog-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  padding: 1rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 1rem;
  background: var(--p-surface-card);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.widget-catalog-item:hover {
  border-color: color-mix(in srgb, var(--p-primary-color), transparent 45%);
  background: color-mix(in srgb, var(--p-primary-color), transparent 96%);
  transform: translateY(-1px);
  box-shadow: 0 10px 24px -18px color-mix(in srgb, var(--p-primary-color), transparent 20%);
}

.widget-catalog-item:focus-visible {
  outline: 2px solid var(--p-primary-color);
  outline-offset: 2px;
}

.widget-catalog-item-main {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  min-width: 0;
}

.widget-catalog-item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  border-radius: 0.85rem;
  background: color-mix(in srgb, var(--p-primary-color), transparent 88%);
  color: var(--p-primary-color);
}

.widget-catalog-item-text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.widget-catalog-item-title {
  font-weight: 600;
  color: var(--p-text-color);
}

.widget-catalog-item-description {
  color: var(--p-text-muted-color);
  line-height: 1.45;
}

.widget-catalog-item-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--p-primary-color), transparent 90%);
  color: var(--p-primary-color);
}

.widget-catalog-empty {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 1rem;
  border: 1px dashed var(--p-content-border-color);
  border-radius: 1rem;
  background: var(--p-surface-card);
  color: var(--p-text-muted-color);
}

.widget-catalog-empty i {
  color: var(--p-green-500);
}
</style>
