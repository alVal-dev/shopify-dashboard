<script setup lang="ts">
import { computed } from 'vue';
import type { RealtimeFeedItem } from '../../types/realtime-feed';

const props = defineProps<{
  items: RealtimeFeedItem[];
}>();

const hasItems = computed(() => props.items.length > 0);

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

function formatCurrency(valueCents: number, currency: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(valueCents / 100);
}

function buildItemTitle(item: RealtimeFeedItem): string {
  if (item.kind === 'order.created') {
    return `Commande #${item.order.orderNumber}`;
  }

  return 'Alerte stock';
}

function buildItemSubtitle(item: RealtimeFeedItem): string {
  if (item.kind === 'order.created') {
    return item.order.customerName || item.order.email;
  }

  const variantTitle = item.alert.variantTitle?.trim();
  return variantTitle ? `${item.alert.productTitle} — ${variantTitle}` : item.alert.productTitle;
}

function buildItemMeta(item: RealtimeFeedItem): string {
  if (item.kind === 'order.created') {
    return formatCurrency(item.order.totalPriceCents, item.order.currency);
  }

  return `Stock ${item.alert.inventoryQuantity} / seuil ${item.alert.threshold}`;
}
</script>

<template>
  <div class="feed-widget">
    <div v-if="!hasItems" class="feed-empty">
      <i class="pi pi-bolt" />
      <span>Aucune activité temps réel pour le moment.</span>
    </div>

    <ul v-else class="feed-list">
      <li v-for="item in items" :key="item.id" class="feed-item" :data-kind="item.kind">
        <div class="feed-item-header">
          <span class="feed-item-kind">
            {{ item.kind === 'order.created' ? 'Nouvelle commande' : 'Alerte stock' }}
          </span>
          <span class="feed-item-time">{{ formatDateTime(item.occurredAt) }}</span>
        </div>

        <div class="feed-item-title">{{ buildItemTitle(item) }}</div>
        <div class="feed-item-subtitle">{{ buildItemSubtitle(item) }}</div>
        <div class="feed-item-meta">{{ buildItemMeta(item) }}</div>

        <div v-if="item.kind === 'stock.alert'" class="feed-item-extra">
          <span class="feed-item-sku">SKU {{ item.alert.sku }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.feed-widget {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.feed-empty {
  flex: 1;
  min-height: 0;
  display: grid;
  place-items: center;
  gap: 0.5rem;
  text-align: center;
  color: var(--p-text-muted-color);
}

.feed-empty i {
  font-size: 1.25rem;
  color: var(--p-primary-color);
}

.feed-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow: auto;
}

.feed-item {
  padding: 0.875rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.875rem;
  background: var(--p-surface-card);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.feed-item[data-kind='order.created'] {
  border-left: 3px solid var(--p-green-500);
}

.feed-item[data-kind='stock.alert'] {
  border-left: 3px solid var(--p-orange-500);
}

.feed-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.feed-item-kind {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--p-text-muted-color);
}

.feed-item-time {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  white-space: nowrap;
}

.feed-item-title {
  font-weight: 600;
  color: var(--p-text-color);
}

.feed-item-subtitle,
.feed-item-meta,
.feed-item-extra {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.feed-item-sku {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8rem;
}
</style>
