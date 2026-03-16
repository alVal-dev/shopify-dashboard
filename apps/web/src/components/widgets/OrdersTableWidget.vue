<script setup lang="ts">
import { computed, ref } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Select from 'primevue/select';
import Button from 'primevue/button';
import type { DataTablePageEvent, DataTableSortEvent } from 'primevue/datatable';
import type { FinancialStatus, Order } from '@shared/types';
import type { OrdersSortBy } from '../../api/query';

import WidgetWrapper from '../WidgetWrapper.vue';
import { exportOrdersCsv } from '../../api/export';
import { formatCurrency } from '../../utils/format';

interface Props {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  loading?: boolean;
  error?: string | null;
  currentStatus?: FinancialStatus | null;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
  currentStatus: null,
});

const emit = defineEmits<{
  'page-change': [page: number];
  'sort-change': [field: OrdersSortBy, order: 'asc' | 'desc'];
  'status-change': [status: FinancialStatus | null];
}>();

const ORDERS_SORT_FIELDS = [
  'createdAt',
  'totalPriceCents',
  'orderNumber',
] as const satisfies readonly OrdersSortBy[];

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const statusOptions: Array<{ label: string; value: FinancialStatus | null }> = [
  { label: 'Tous les statuts', value: null },
  { label: 'En attente', value: 'pending' },
  { label: 'Payée', value: 'paid' },
  { label: 'Remboursée', value: 'refunded' },
  { label: 'Annulée', value: 'cancelled' },
];

const statusConfig = {
  pending: { label: 'En attente', severity: 'warn' },
  paid: { label: 'Payée', severity: 'success' },
  refunded: { label: 'Remboursée', severity: 'info' },
  cancelled: { label: 'Annulée', severity: 'danger' },
} satisfies Record<FinancialStatus, { label: string; severity: string }>;

const isExporting = ref(false);
const exportError = ref<string | null>(null);

function isOrdersSortBy(value: string): value is OrdersSortBy {
  return ORDERS_SORT_FIELDS.some((field) => field === value);
}

function formatOrderNumber(orderNumber: number): string {
  return `#${orderNumber}`;
}

function formatDate(isoDate: string): string {
  return dateTimeFormatter.format(new Date(isoDate));
}

function formatAmount(cents: number): string {
  return formatCurrency(cents);
}

function getStatusConfig(status: FinancialStatus) {
  return statusConfig[status];
}

const first = computed(() => (props.page - 1) * props.limit);
const hasData = computed(() => props.orders.length > 0);

function onPage(event: DataTablePageEvent) {
  const newPage = (event.page ?? 0) + 1;
  emit('page-change', newPage);
}

function onSort(event: DataTableSortEvent) {
  if (typeof event.sortField !== 'string') {
    return;
  }

  if (!isOrdersSortBy(event.sortField)) {
    console.warn(
      '[OrdersTableWidget] Champ de tri inattendu reçu depuis PrimeVue DataTable :',
      event.sortField,
    );
    return;
  }

  if (event.sortOrder !== 1 && event.sortOrder !== -1) {
    return;
  }

  const order = event.sortOrder === 1 ? 'asc' : 'desc';
  emit('sort-change', event.sortField, order);
}

function onStatusChange(status: FinancialStatus | null) {
  emit('status-change', status);
}

async function onExportClick(): Promise<void> {
  if (isExporting.value) {
    return;
  }

  exportError.value = null;
  isExporting.value = true;

  try {
    await exportOrdersCsv();
  } catch (error) {
    console.error('[OrdersTableWidget] Erreur lors de l’export CSV des commandes :', error);
    exportError.value = 'Impossible de télécharger le fichier CSV.';
  } finally {
    isExporting.value = false;
  }
}
</script>

<template>
  <WidgetWrapper
    title="Commandes récentes"
    icon="pi pi-shopping-cart"
    :loading="loading"
    :scrollable="true"
  >
    <div v-if="error" class="error-state">
      <i class="pi pi-exclamation-triangle" />
      <span>{{ error }}</span>
    </div>

    <template v-else>
      <div class="table-header">
        <Button
          icon="pi pi-download"
          label="Exporter CSV"
          size="small"
          severity="secondary"
          outlined
          :loading="isExporting"
          :disabled="isExporting"
          @click="onExportClick"
        />

        <Select
          :model-value="currentStatus"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          placeholder="Filtrer par statut"
          class="status-filter"
          @update:model-value="onStatusChange"
        />
      </div>

      <div v-if="exportError" class="export-error">
        <i class="pi pi-exclamation-circle" />
        <span>{{ exportError }}</span>
      </div>

      <div v-if="!hasData && !loading" class="empty-state">
        <i class="pi pi-inbox" />
        <span>Aucune commande</span>
      </div>

      <DataTable
        v-else
        :value="orders"
        :lazy="true"
        :paginator="true"
        :rows="limit"
        :total-records="total"
        :first="first"
        :loading="loading"
        :sortable="true"
        removable-sort
        paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
        class="orders-table"
        @page="onPage"
        @sort="onSort"
      >
        <Column field="orderNumber" header="N°" sortable style="width: 100px">
          <template #body="{ data }">
            {{ formatOrderNumber(data.orderNumber) }}
          </template>
        </Column>

        <Column field="customerName" header="Client" style="min-width: 150px">
          <template #body="{ data }">
            {{ data.customerName }}
          </template>
        </Column>

        <Column field="totalPriceCents" header="Montant" sortable style="width: 120px">
          <template #body="{ data }">
            {{ formatAmount(data.totalPriceCents) }}
          </template>
        </Column>

        <Column field="financialStatus" header="Statut" style="width: 120px">
          <template #body="{ data }">
            <Tag
              :value="getStatusConfig(data.financialStatus).label"
              :severity="getStatusConfig(data.financialStatus).severity"
            />
          </template>
        </Column>

        <Column field="createdAt" header="Date" sortable style="width: 150px">
          <template #body="{ data }">
            {{ formatDate(data.createdAt) }}
          </template>
        </Column>
      </DataTable>
    </template>
  </WidgetWrapper>
</template>

<style scoped>
.error-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 100%;
  min-height: 200px;
  color: var(--p-text-muted-color);
}

.error-state i {
  color: var(--p-orange-500);
}

.empty-state i {
  color: var(--p-blue-500);
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.status-filter {
  width: 180px;
  max-width: 100%;
}

.export-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  color: var(--p-red-500);
  font-size: 0.875rem;
}

.orders-table {
  font-size: 0.9rem;
}

.orders-table :deep(.p-datatable-header) {
  background: transparent;
  border: none;
  padding: 0;
}

.orders-table :deep(.p-datatable-thead > tr > th) {
  background: var(--p-surface-ground);
  border-color: var(--p-surface-border);
  padding: 0.75rem;
}

.orders-table :deep(.p-datatable-tbody > tr > td) {
  padding: 0.75rem;
  border-color: var(--p-surface-border);
}

.orders-table :deep(.p-paginator) {
  background: transparent;
  border: none;
  padding: 0.75rem 0 0;
}
</style>
