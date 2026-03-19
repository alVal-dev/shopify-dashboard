# Shopify Analytics Dashboard

Dashboard analytics connecté à une boutique Shopify fictive. Projet portfolio full-stack démontrant des interactions DOM avancées et une architecture de production.

> 🔗 **[Démo en ligne](https://shopify-dashboard-web.onrender.com/)** — cliquer "Explorer la démo" ou utiliser `john@example.com` / `password123`

<p align="center">
  <img src="./docs/assets/demo.gif" width="800" alt="Demo du Dashboard">
</p>

## Ce que ce projet démontre

- **Gridstack + Vue 3** — drag & drop, resize, persistance layout (pattern Vue-first + `makeWidget()`)
- **Temps réel SSE** — reconnexion automatique, backoff exponentiel, watchdog
- **Auth session cookie HttpOnly** — pas de JWT côté client, lazy delete des sessions expirées
- **Single origin** — NestJS sert le SPA, pas de CORS
- **Données mockées réalistes** — générateurs avec gestion de stock cohérente et distribution pondérée
- **Export CSV** — BOM UTF-8, échappement complet, 3 types
- **Tests à 3 niveaux** — unitaire (134 tests), intégration (29 tests), E2E (3 flows)

## Stack

| Couche   | Technologie                                      |
| -------- | ------------------------------------------------ |
| Frontend | Vue 3, Pinia, PrimeVue, ECharts, Gridstack, Vite |
| Backend  | NestJS, Prisma, PostgreSQL                       |
| Tests    | Jest, Vitest, Playwright                         |
| Infra    | Docker Compose, GitHub Actions, Render, Supabase |

## Démarche de réalisation

Ce projet a été conçu et réalisé avec l'assistance de deux LLM travaillant en parallèle. Chaque décision d'architecture a été cadrée avant d'être codée : analyse des options, trade-offs documentés, choix verrouillés. Les propositions des deux modèles étaient systématiquement confrontées et challengées avant validation.

L'objectif était d'explorer une démarche de développement assisté où le développeur garde le rôle de décideur et de garant de la qualité.

## Lancer en local

# 1. Installer les dépendances

```bash
pnpm install
```

# 2. Lancer la base de données

```bash
pnpm docker:up
```

# 3. Migrer et populer la base de données

```bash
cd apps/api
export DATABASE_URL="postgresql://dashboard:dashboard_dev_password@localhost:5432/shopify_dashboard"
npx prisma migrate deploy
npx tsx prisma/seed.ts
cd ../..
```

# 4. Lancer les serveurs de développement

```bash
pnpm dev
```

Ouvrir [http://localhost:5173](http://localhost:5173)

## Tests

### Unitaires (backend + frontend)

```bash
pnpm test
```

Intégration backend (Docker requis)

```Bash
pnpm -C apps/api exec jest -c jest.integration.config.cjs --runInBand src/__tests__
```

E2E (serveurs dev requis)

```Bash
pnpm test:e2e
```

Détails des stratégies de test dans docs/testing.md

## Documentation

- 📐 [Architecture](./docs/architecture.md)
- 🔌 [API](./docs/api.md)
- 🔒 [Sécurité](./docs/security.md)
- 🗄️ [Modèle de données](./docs/data-model.md)
- 🧪 [Stratégie de Tests](./docs/testing.md)
- 📝 [ADR (Architecture Decision Records)](./docs/adr/)
