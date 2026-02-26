import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const LoginView = () => import('../views/LoginView.vue');
const DashboardView = () => import('../views/DashboardView.vue');

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },

    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guest: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true },
    },

    // Catch-all -> dashboard (le guard redirigera vers login si besoin)
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
});

// Empêche les checkAuth parallèles
let checkAuthInFlight: Promise<void> | null = null;

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  // S'assurer que l'état auth est chargé avant de décider
  if (!auth.isInitialized) {
    if (!checkAuthInFlight) {
      checkAuthInFlight = auth.checkAuth().finally(() => {
        checkAuthInFlight = null;
      });
    }
    await checkAuthInFlight;
  }

  const isAuthenticated = auth.isAuthenticated;

  // Route protégée + pas authentifié => login + redirect
  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  // Route guest (login) + déjà authentifié => redirect vers cible ou dashboard
  if (to.meta.guest && isAuthenticated) {
    const redirectTo =
      typeof to.query.redirect === 'string' && to.query.redirect.trim().length > 0
        ? to.query.redirect
        : '/dashboard';

    // navigation interne, pas de full reload
    return redirectTo;
  }

  return true;
});

export default router;