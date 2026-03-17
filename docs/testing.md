# Testing Strategy — Shopify Analytics Dashboard

## Objectif

Le projet utilise plusieurs niveaux de tests pour sécuriser :

- la logique métier pure,
- les flux backend intégrés,
- les stores et composables frontend,
- les parcours critiques utilisateur.

La stratégie reste volontairement pragmatique :

- forte valeur de confiance,
- faible flakiness,
- couverture priorisée sur les scénarios les plus utiles pour un projet portfolio.

---

## Répartition des tests

## 1. Backend — tests unitaires

Couvrent principalement :

- générateurs mock Shopify
- logique d’export CSV
- helpers backend utiles

Exécution :

```bash
pnpm -C apps/api test
```

## 2. Backend — tests d’intégration

Couvrent principalement :

auth
layout dashboard
export backend
SSE backend
Les tests d’intégration backend sont regroupés dans :

```
apps/api/src/__tests__/
```

Commande de référence

```Bash
pnpm -C apps/api exec jest -c jest.config.cjs --runInBand src/__tests__
```

Pourquoi --runInBand est obligatoire
Les suites d’intégration backend :

partagent la même base Postgres locale,
nettoient explicitement les données entre tests,
ouvrent parfois des ressources longues (ex : SSE).
L’exécution séquentielle évite :

collisions entre suites,
faux échecs liés aux nettoyages concurrents,
problèmes de sessions / foreign keys,
flakiness liée aux workers Jest.
Ne pas lancer ces suites en parallèle tant que l’infrastructure de test n’a pas été isolée par base dédiée ou transaction rollback par worker.

Pré-requis
Avant de lancer les tests d’intégration backend :

démarrer Postgres
appliquer les migrations Prisma
vérifier que DATABASE_URL pointe vers la base locale attendue
Exemple :

```Bash

pnpm docker:up
pnpm -C apps/api exec prisma migrate deploy
pnpm -C apps/api exec jest -c jest.config.cjs --runInBand src/__tests__
```

## 3. Frontend — tests unitaires

Couvrent principalement :

stores Pinia
composables Vue
helpers de formatage
layout mapper
logique SSE côté client
Exécution :

```Bash
pnpm -C apps/web test
```

Exécution ciblée possible :

```Bash
pnpm -C apps/web exec vitest run src/stores/__tests__/auth.spec.ts
pnpm -C apps/web exec vitest run src/composables/__tests__/useSSE.spec.ts
```

## 4. E2E — parcours critiques

Framework retenu : Playwright

Le lot E2E reste volontairement réduit pour limiter la flakiness.

Scénarios couverts :

login demo → dashboard
logout / route protégée
export CSV orders depuis l’UI
Exécution :

```Bash
pnpm test:e2e
```

Mode visible :

```Bash
pnpm test:e2e:headed
```

Pré-requis E2E
Les E2E tournent contre :

```
backend local sur http://localhost:3000
frontend Vite local sur http://localhost:5173
proxy /api côté frontend
```

Avant de lancer les E2E :

```
démarrer Postgres
lancer le backend
lancer le frontend
vérifier que http://localhost:5173/login est accessible
```

Exemple :

```Bash
pnpm docker:up
pnpm -C apps/api dev
pnpm -C apps/web dev
pnpm test:e2e
```

Commandes utiles
Backend unitaire

```Bash
pnpm -C apps/api test
```

Backend intégration

```Bash
pnpm -C apps/api exec jest -c jest.config.cjs --runInBand src/__tests__
```

Frontend unitaire

```Bash
pnpm -C apps/web test
```

Frontend unitaire ciblé

```Bash
pnpm -C apps/web exec vitest run src/utils/__tests__/format.spec.ts
pnpm -C apps/web exec vitest run src/utils/__tests__/layout-mapper.spec.ts
pnpm -C apps/web exec vitest run src/stores/__tests__/dashboard.spec.ts
pnpm -C apps/web exec vitest run src/composables/__tests__/useTheme.spec.ts
pnpm -C apps/web exec vitest run src/composables/__tests__/useSSE.spec.ts
```

## E2E

```Bash
pnpm test:e2e
```

E2E mode visible

```Bash
pnpm test:e2e:headed
```

Points de vigilance
Backend intégration

```
toujours exécuter en séquentiel (--runInBand)
éviter les nettoyages concurrents de la DB
ne pas paralléliser tant que la base n’est pas isolée par worker
Frontend
certains composables utilisent des mocks browser (EventSource, matchMedia, localStorage)
useTheme repose sur un état singleton de module : attention aux resets de modules dans les tests
E2E
ne pas surinvestir les scénarios drag/drop et reconnexion SSE si la suite devient flaky
privilégier les parcours critiques les plus démonstratifs
Philosophie de couverture
Le projet ne cherche pas une exhaustivité artificielle.
```

La priorité est donnée à :

```
la logique pure à forte valeur,
les flux backend critiques,
les parcours utilisateur les plus visibles,
la stabilité de la suite dans le temps.
```

En particulier :

```
les tests unitaires verrouillent les transformations et comportements métiers,
les tests d’intégration backend sécurisent les contrats réels,
les E2E valident les parcours critiques sans transformer la suite en test de charge ou de timing fragile.
```

---
