<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import Toolbar from 'primevue/toolbar';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Chip from 'primevue/chip';
import Card from 'primevue/card';
import Divider from 'primevue/divider';

import { useAuthStore } from '../stores/auth';
import { useTheme } from '../composables/useTheme';

const router = useRouter();
const auth = useAuthStore();
const theme = useTheme();

const userEmail = computed(() => auth.user?.email ?? '');
const envLabel = computed(() => (auth.isDemo ? 'Sandbox demo' : 'User session'));
const envSeverity = computed(() => (auth.isDemo ? 'warning' : 'success'));

const themeIcon = computed(() => (theme.isDark.value ? 'pi pi-sun' : 'pi pi-moon'));
const themeLabel = computed(() => (theme.isDark.value ? 'Light' : 'Dark'));

async function handleLogout(): Promise<void> {
  await auth.logout();
  await router.replace('/login');
}
</script>

<template>
  <div class="page">
    <Toolbar class="header">
      <template #start>
        <div class="brand">
          <div class="brand-mark">
            <i class="pi pi-chart-bar" />
          </div>

          <div class="brand-text">
            <div class="brand-title-row">
              <span class="brand-title">Shopify Analytics</span>
              <Tag :value="envLabel" :severity="envSeverity" class="env-tag" />
            </div>

            <div class="brand-subtitle">
              Data-viz dashboard sandbox • Single-origin (API + SSE + SPA)
            </div>
          </div>
        </div>
      </template>

      <template #end>
        <div class="actions">
          <Chip v-if="userEmail" class="user-chip">
            <span class="user-chip-inner" :title="userEmail">
              <i class="pi pi-user" />
              <span class="user-email">{{ userEmail }}</span>
            </span>
          </Chip>

          <Divider layout="vertical" class="v-divider" />

          <Button
            :icon="themeIcon"
            :label="themeLabel"
            text
            severity="secondary"
            @click="theme.toggleTheme()"
          />

          <Button
            icon="pi pi-sign-out"
            label="Logout"
            text
            severity="secondary"
            @click="handleLogout"
          />
        </div>
      </template>
    </Toolbar>

    <div v-if="auth.isDemo" class="notice">
      <i class="pi pi-info-circle" />
      <span>
        Mode démo : données fictives, réinitialisées régulièrement. Ne pas utiliser de données
        réelles.
      </span>
    </div>

    <main class="content">
      <div class="container">
        <Card class="placeholder-card">
          <template #title>
            <div class="card-title">
              <span>Dashboard</span>
              <Tag value="Widgets bientôt" severity="secondary" />
            </div>
          </template>

          <template #content>
            <div class="kpi-grid">
              <div class="kpi">
                <div class="kpi-label">Revenue (30j)</div>
                <div class="kpi-value">$—</div>
                <div class="kpi-hint">En attente de la Mock API</div>
              </div>

              <div class="kpi">
                <div class="kpi-label">Orders</div>
                <div class="kpi-value">—</div>
                <div class="kpi-hint">En attente de la Mock API</div>
              </div>
            </div>

            <Divider />

            <div class="empty-state">
              <i class="pi pi-objects-column empty-icon" />
              <div class="empty-text">
                <p class="empty-title">Les widgets arriveront bientôt</p>
                <p class="empty-subtitle">
                  Prochaines étapes : widgets KPI, graphiques ECharts, table commandes, layout
                  persisté.
                </p>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--p-surface-ground);
  color: var(--p-text-color);
}

.header {
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-top: none;
  background: color-mix(in srgb, var(--p-surface-card), transparent 0%);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-mark {
  width: 2.25rem;
  height: 2.25rem;
  display: grid;
  place-items: center;
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--p-primary-color), transparent 88%);
  color: var(--p-primary-color);
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.brand-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.brand-title {
  font-weight: 700;
  letter-spacing: -0.2px;
}

.brand-subtitle {
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

.env-tag {
  font-size: 0.75rem;
}

/* Actions */
.actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.v-divider {
  height: 1.5rem;
  margin: 0 0.25rem;
  opacity: 0.5;
}

.user-chip {
  max-width: 280px;
}

.user-chip-inner {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  max-width: 260px;
}

.user-email {
  display: inline-block;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  padding: 0.5rem 1rem;
  font-size: 0.875rem;

  background: color-mix(in srgb, var(--p-primary-color), transparent 94%);
  border-bottom: 1px solid color-mix(in srgb, var(--p-primary-color), transparent 80%);
  color: var(--p-text-color);
}

.notice i {
  color: var(--p-primary-color);
}

.content {
  padding: 1.25rem 1rem 2rem;
}

.container {
  max-width: 1040px;
  margin: 0 auto;
}

.placeholder-card {
  border: 1px solid var(--p-surface-border);
}

.card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.kpi {
  border: 1px solid var(--p-surface-border);
  border-radius: var(--p-border-radius);
  padding: 0.75rem;
  background: var(--p-surface-card);
}

.kpi-label {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

.kpi-value {
  margin-top: 0.25rem;
  font-size: 1.25rem;
  font-weight: 700;
}

.kpi-hint {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

.empty-state {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.empty-icon {
  font-size: 2.25rem;
  opacity: 0.5;
}

.empty-title {
  margin: 0;
  font-weight: 700;
}

.empty-subtitle {
  margin: 0.15rem 0 0;
  color: var(--p-text-muted-color);
}

@media (max-width: 640px) {
  .brand-subtitle {
    display: none;
  }
  .kpi-grid {
    grid-template-columns: 1fr;
  }
  .user-chip {
    display: none;
  }
}
</style>
