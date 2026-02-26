import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import './assets/main.css';
import 'primeicons/primeicons.css';
import { useTheme } from './composables/useTheme';


import { initApiClient } from './api';

useTheme().initTheme();

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.dark',
    },
  },
});

initApiClient(router)

app.mount('#app');
