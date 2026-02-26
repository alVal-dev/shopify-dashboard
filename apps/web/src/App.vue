<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import ProgressSpinner from 'primevue/progressspinner';

import { useAuthStore } from './stores/auth';

const auth = useAuthStore();

onMounted(async () => {
  if (!auth.isInitialized) {
    await auth.checkAuth();
  }
});
</script>

<template>
  <div class="app-root">
    <div v-if="!auth.isInitialized" class="app-loader">
      <ProgressSpinner strokeWidth="3" />
      <p class="app-loader-text">Loading…</p>
    </div>

    <RouterView v-else />
  </div>
</template>

<style scoped>
.app-root {
  min-height: 100vh;
}

.app-loader {
  min-height: 100vh;
  display: grid;
  place-items: center;
  gap: 0.75rem;
  background: var(--p-surface-ground);
  color: var(--p-text-muted-color);
}

.app-loader-text {
  margin: 0;
  font-size: 0.9rem;
}
</style>