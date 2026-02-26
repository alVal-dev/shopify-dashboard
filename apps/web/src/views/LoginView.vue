<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute  } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Divider from 'primevue/divider';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Password from 'primevue/password';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');

function getPostLoginRedirect(): string {
  const redirect = route.query.redirect;

  if (typeof redirect === 'string' && redirect.trim().length > 0) {
    return redirect;
  }

  return '/dashboard';
}

async function redirectAfterLogin(): Promise<void> {
  await router.replace(getPostLoginRedirect());
}

async function handleDemo(): Promise<void> {
  try {
    await authStore.loginDemo();
    await redirectAfterLogin();
  } catch {
    // authStore.error déjà renseigné
  }
}

async function handleLogin(): Promise<void> {
  try {
    await authStore.loginWithCredentials(email.value.trim(), password.value);
    await redirectAfterLogin();
  } catch {
    // authStore.error déjà renseigné
  }
}
</script>

<template>
  <div class="login-page">
    <Card class="login-card">
      <template #title>
        <div class="login-header">
          <i class="pi pi-chart-bar login-logo" />
          <h1>Shopify Analytics</h1>
          <p class="login-subtitle">Dashboard de démonstration</p>
        </div>
      </template>

      <template #content>
        <!-- Message d'erreur -->
        <Message
          v-if="authStore.error"
          severity="error"
          :closable="false"
          class="login-error"
        >
          {{ authStore.error }}
        </Message>

        <!-- Bouton démo -->
        <Button
          label="Explorer la démo"
          icon="pi pi-play"
          class="login-demo-btn"
          :loading="authStore.isLoading"
          @click="handleDemo"
          severity="success"
          fluid
        />

        <Divider align="center">
          <span class="login-divider-text">ou connectez-vous</span>
        </Divider>

        <!-- Formulaire login -->
        <form class="login-form" @submit.prevent="handleLogin">
          <div class="login-field">
            <label for="email">Email</label>
            <InputText
              id="email"
              v-model="email"
              type="email"
              placeholder="email@exemple.com"
              :disabled="authStore.isLoading"
              class="login-input"
              fluid
            />
          </div>

          <div class="login-field">
            <label for="password">Mot de passe</label>
            <Password
              id="password"
              v-model="password"
              :feedback="false"
              :disabled="authStore.isLoading"
              toggle-mask
              fluid
            />
            <pre>email="{{ email }}" password="{{ password }}"</pre>
          </div>

          <Button
            type="submit"
            label="Se connecter"
            icon="pi pi-sign-in"
            :loading="authStore.isLoading"
            :disabled="!email.trim() || !password"
            fluid
          />
        </form>

        <!-- Credentials de test -->
        <Divider />

        <div class="login-credentials">
          <p class="login-credentials-title">
            <i class="pi pi-info-circle" />
            Credentials de test
          </p>
          <code>
            Email : john@example.com<br />
            Password : password123
          </code>
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
  background: var(--p-surface-ground);
}

.login-card {
  width: 100%;
  max-width: 420px;
}

.login-header {
  text-align: center;
}

.login-logo {
  font-size: 2.5rem;
  color: var(--p-primary-color);
  margin-bottom: 0.5rem;
}

.login-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--p-text-color);
}

.login-subtitle {
  margin: 0.25rem 0 0;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.login-error {
  margin-bottom: 1rem;
}

.login-demo-btn {
  margin-bottom: 0.5rem;
}

.login-input::placeholder {
  opacity: 0.4;
}

.login-divider-text {
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.login-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.login-field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
}

.login-credentials {
  background: var(--p-content-hover-background);
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-border-radius);
  padding: 0.75rem 1rem;
}

.login-credentials-title {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.login-credentials code {
  font-size: 0.8rem;
  line-height: 1.6;
  color: var(--p-text-color);
}
</style>