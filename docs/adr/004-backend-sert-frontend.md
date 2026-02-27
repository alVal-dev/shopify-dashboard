# ADR 004 — Le backend (NestJS) sert le frontend (SPA) sur le même origin

- **Statut** : Accepté
- **Date** : 2026-02-27
- **Décideurs** : Projet portfolio (monorepo NestJS + Vue)
- **Contexte** : Shopify Analytics Dashboard (sandbox publique)

## Contexte

L'application Shopify Analytics Dashboard est composée de :

- un backend NestJS (API REST + SSE)
- un frontend Vue 3 (SPA)

En développement :

- Vite sert le frontend sur `:5173`
- un proxy Vite redirige `/api` vers le backend NestJS sur `:3000`

En production, il faut décider comment exposer le frontend + l’API + SSE.

### Contraintes / objectifs

- **Auth par cookie HttpOnly** : les cookies first‑party sont plus simples et plus robustes.
- **SSE (Server‑Sent Events)** : connexion longue durée, sensible aux problèmes CORS.
- **Déploiement simple** : un seul service sur Render (free tier).
- **Portfolio** : démontrer une architecture cohérente, sans complexité inutile.

Deux grandes architectures sont possibles :

1. **Déploiement séparé** (frontend sur un domaine, API sur un autre)
2. **Single origin** : le backend sert le SPA et expose l’API sous `/api`

## Options considérées

### Option A — Deux services séparés (ex. Vercel/Netlify + Render)

**Architecture**

- Frontend sur Vercel/Netlify (CDN)
- Backend sur Render
- Deux origins différents (ex: `app.netlify.app` + `api.onrender.com`)

**Avantages**

- CDN pour les assets statiques
- Déploiement front indépendant

**Inconvénients**

- CORS à configurer (risques d’erreur et différences dev/prod)
- Cookies cross-origin plus complexes (`SameSite=None` + `Secure` obligatoire)
- SSE cross-origin plus fragile (headers CORS sur connexion longue, proxies)
- Deux services à gérer (et potentiellement deux cold starts)

### Option B — Backend sert le frontend (single origin) **(retenue)**

**Architecture**

- NestJS sert les fichiers statiques du SPA via `@nestjs/serve-static`
- Une seule URL pour tout : SPA, API, SSE
- Un seul service déployé sur Render

**Avantages**

- Zéro CORS (même origin)
- Cookies first-party simples (`SameSite=Lax` suffit)
- SSE sans configuration spéciale
- Un seul service à déployer/monitorer (un seul cold start)

**Inconvénients**

- Pas de CDN dédié pour les assets (acceptable pour un portfolio)
- Le backend sert aussi du statique (charge faible, surtout avec cache navigateur)

### Option C — Reverse proxy (nginx/Caddy) devant 2 apps

**Architecture**

- Un reverse proxy route `/api/*` vers le backend et `/*` vers le frontend
- Même origin, mais apps séparées

**Avantages**

- Même origin (comme B)
- Séparation front/back

**Inconvénients**

- Complexité infra (un service de plus)
- Over-engineering pour un portfolio

## Décision

Nous choisissons **Option B — Backend sert le frontend (single-origin)** :

- NestJS sert le build Vite (`apps/web/dist`) sur `/`
- L’API est exposée sous `/api/*` (préfixe global Nest)
- Les endpoints SSE seront exposés sous `/api/sse/*` (même origin)
- Les routes SPA (`/login`, `/dashboard`, etc.) sont gérées côté client (Vue Router) via un fallback vers `index.html`

## Justification

### 1) Simplicité maximale (opérationnelle + cognitive)

Un seul service, une seule URL, un seul déploiement. Pour un portfolio, la simplicité et la reproductibilité priment sur l’optimisation CDN.

### 2) Auth cookie sans friction

Avec le même origin :

- pas de configuration CORS
- pas de cookies cross-site (pas de `SameSite=None`)
- le navigateur envoie naturellement le cookie vers `/api/*` (frontend : `withCredentials: true`)

### 3) SSE natif et fiable

SSE fonctionne sans configuration spéciale (pas de CORS, pas de préflight) et reste cohérent avec l’auth cookie.

### 4) Render free tier (cold starts)

Un seul service = un seul cold start. Deux services séparés peuvent doubler les temps d’attente (front + back).

### 5) Performance acceptable grâce au caching

Les assets Vite sont hashés (fingerprinted). Avec des headers adaptés :

- `index.html` est revalidé (évite de servir un index obsolète)
- les assets hashés sont cachés longtemps (`immutable`)

L’absence de CDN n’est pas critique pour un portfolio à faible trafic.

## Implémentation (réalité du code)

### ServeStaticModule (NestJS)

Le backend sert `apps/web/dist` et exclut l’API pour éviter toute interférence.

```ts
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

ServeStaticModule.forRoot({
  rootPath: join(__dirname, '..', '..', 'web', 'dist'),
  exclude: ['/api{/*path}'],
  serveStaticOptions: {
    setHeaders: (res, filePath) => {
      const p = filePath.replace(/\\/g, '/');

      if (p.endsWith('/index.html')) {
        res.setHeader('Cache-Control', 'no-cache');
        return;
      }

      if (p.includes('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return;
      }

      if (p.endsWith('/favicon.ico')) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return;
      }

      res.setHeader('Cache-Control', 'public, max-age=3600');
    },
  },
});
```

> Note : l’exclusion `'/api*'` (glob) a été testée et a provoqué une erreur `path-to-regexp`. Le pattern `'/api{/*path}'` est compatible.

### Headers de cache (résumé)

| Type          | Cache-Control                         | Raison                                             |
| ------------- | ------------------------------------- | -------------------------------------------------- |
| `index.html`  | `no-cache`                            | Toujours revalider pour servir la dernière version |
| `/assets/*`   | `public, max-age=31536000, immutable` | Hash dans le nom = cache long sûr                  |
| `favicon.ico` | `public, max-age=86400`               | Cache modéré                                       |
| autres        | `public, max-age=3600`                | Défaut raisonnable                                 |

### Scripts de build / start

L’ordre est important : le frontend doit être buildé avant le backend afin que `apps/web/dist` existe au moment où Nest sert le statique.

```json
{
  "build": "pnpm build:web && pnpm build:api",
  "start": "node apps/api/dist/main.js"
}
```

### Fallback SPA

En production, un refresh sur `/dashboard` retourne `index.html`, puis Vue Router prend le relais côté client.

## Conséquences

### Positives

- Zéro configuration CORS
- Auth cookie simple et cohérente (same-origin)
- SSE sans friction
- Un seul service Render à déployer/monitorer
- Déploiement “single origin” facile à expliquer en entretien

### Négatives / limites

- Pas de CDN dédié (impact négligeable grâce au cache navigateur)
- Le backend sert des fichiers statiques (mais charge faible et maîtrisée)

### Alternatives futures (si besoin)

- Ajouter Cloudflare devant Render (CDN + protection)
- Séparer front/back (Option A) avec une config CORS stricte

## Notes de validation (tests réalisés)

En mode “prod-like” local (build web + build api + start backend seul) :

- `GET /` sert le SPA
- `GET /dashboard` sert `index.html` (deep link + refresh OK)
- `GET /api/health` renvoie 200 JSON
- login démo + refresh sur `/dashboard` fonctionne

## Références

- NestJS Serve Static : https://docs.nestjs.com/recipes/serve-static
- MDN HTTP caching : https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching
- Vite build & caching : https://vitejs.dev/guide/build.html
