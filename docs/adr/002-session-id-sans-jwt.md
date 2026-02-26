# ADR 002 — Session ID cookie (HttpOnly) sans JWT

- **Statut** : Accepté
- **Date** : 26-02-2026
- **Décideurs** : Projet portfolio (monorepo NestJS + Vue)
- **Contexte** : Shopify Analytics Dashboard (sandbox publique)

## Contexte

L’application est une démo/portfolio déployée publiquement. Elle expose un SPA (Vue), une API (NestJS) et plus tard un flux temps réel (SSE). Le backend sert le SPA sur le **même origin** que l’API, afin de simplifier CORS, cookies et SSE.

L’authentification doit être :
- simple à auditer (portfolio),
- suffisamment robuste pour une sandbox publique,
- cohérente avec un déploiement **single-origin**,
- sans complexité inutile (refresh tokens, rotation, stockage côté client).

Deux familles d’approches existent pour l’authentification d’un SPA :
1. **JWT** (tokens signés, stockés côté client et transmis via header/cookie)
2. **Sessions serveur** (ID opaque stocké dans un cookie, validation côté serveur)

## Décision

Nous utilisons une authentification basée sur **sessions serveur** :

- Un cookie **HttpOnly** (nom : `sessionId`) stocke un identifiant **opaque** (UUID), sans payload.
- Les sessions sont persistées en PostgreSQL (table `sessions`) avec `expiresAt`.
- À chaque requête authentifiée : lookup DB + vérification expiration.  
  Si expirée, suppression “lazy” (best-effort) et retour 401.
- **Pas de JWT** (ni access token, ni refresh token).

Attributs du cookie (implémentation actuelle) :
- `HttpOnly: true`
- `SameSite: Lax`
- `Secure: true` en production (HTTPS), `false` en dev
- `Path: /`
- `Expires: expiresAt` (24h)

> Note : un CRON supprime périodiquement les sessions expirées (best-effort). La protection réelle reste la validation de `expiresAt` à chaque requête.

## Options considérées

### Option A — JWT classique (access + refresh tokens)
**Flow (typique)** :
- Login → access token (ex. 15min) + refresh token (ex. 7j)
- Access token envoyé via `Authorization: Bearer ...`
- Refresh token en cookie HttpOnly pour renouveler l’access token

**Avantages**
- “Stateless” côté serveur (en théorie) et scalable horizontalement
- Pattern largement documenté

**Inconvénients**
- Complexité (rotation refresh, révocation, edge cases multi-device)
- Révocation difficile : un JWT volé reste valide jusqu’à expiration
- Stockage de l’access token : localStorage (risque XSS) ou mémoire (perdu au refresh)
- Over-engineering pour un projet mono-instance / sandbox

### Option B — JWT simplifié (token unique longue durée)
**Flow**
- Login → JWT unique (ex. 24h) en cookie HttpOnly

**Avantages**
- Plus simple que Option A
- HttpOnly limite l’exfiltration directe via JS

**Inconvénients**
- Révocation toujours problématique sans état serveur (blacklist)
- Payload JWT lisible (base64), même si signé
- Ajoute de la complexité sans gain réel dans ce contexte

### Option C — Session ID opaque en cookie HttpOnly (**retenue**)
**Flow**
- Login → génération UUID (opaque) + insertion DB + cookie HttpOnly
- Requête → lecture cookie → lookup DB → validation `expiresAt` (lazy delete si expirée)
- Logout → suppression session DB + effacement cookie

**Avantages**
- Révocation immédiate et explicite (delete DB)
- Pas de payload exposé côté client
- Simple à comprendre et à auditer
- Très adapté au single-origin et au SSE

**Inconvénients**
- Lookup DB par requête authentifiée
- Stateful (mais on a déjà PostgreSQL/Prisma)

## Justification (pourquoi pas JWT)

### 1) Alignement avec le déploiement “single-origin”
Avec un seul origin, les cookies sont le mécanisme le plus simple et robuste :
- `withCredentials` côté front,
- compatibilité SSE sans bricolage,
- pas de gestion complexe de headers/stockage tokens.

### 2) Sécurité pragmatique côté client
- `HttpOnly` empêche l’accès au cookie via `document.cookie` ⇒ réduit l’exfiltration directe par XSS.
- Pas de token en `localStorage` / `sessionStorage` ⇒ évite une classe de risques courants.

> HttpOnly ne “résout” pas XSS : un script injecté peut agir au nom de l’utilisateur. Mais il limite la fuite de secrets.

### 3) Contrôle serveur (expiration/révocation)
- Logout immédiat et fiable (suppression DB)
- Expiration contrôlée côté serveur
- Politiques de session simples à faire évoluer

### 4) Complexité JWT non justifiée ici
Le principal intérêt JWT (stateless, scalable) n’apporte pas de valeur proportionnelle dans un projet sandbox/mono-instance, alors que le coût en complexité (refresh tokens, rotation, storage, edge cases) est réel.

## Conséquences

### Positives
- Flow auth clair et facile à expliquer (entretien + audit)
- Révocation instantanée
- Compatible SSE + cookies sur le même origin
- Surface de bug plus faible qu’un système refresh token

### Négatives / limites
- **Stateful** : sessions stockées en DB
- Un lookup DB par requête authentifiée (acceptable ici)
- En scaling horizontal : sessions OK (DB), mais certaines protections “in-memory” (ex. throttler) restent best-effort sans store partagé

## Notes d’implémentation (réalité du code)

### Backend NestJS
- Endpoints :
  - `POST /api/auth/demo`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `POST /api/auth/logout`
- Guard : lit le cookie `sessionId`, valide via `SessionsService.validateSession`
- Session :
  - `sessionId` = UUID opaque
  - `expiresAt` = now + 24h
  - lazy delete si expirée
- Nettoyage :
  - lazy delete à la validation
  - CRON horaire best-effort : `deleteMany` des sessions expirées

### Front Vue
- Axios : `withCredentials: true`
- Interceptor 401 → redirect `/login` (sauf requêtes marquées `silent401`)
- `checkAuth()` appelé au boot (App + router guards)

## Comment vérifier / critères d’acceptation

- Après login :
  - le cookie `sessionId` est visible dans DevTools (Application → Cookies)
  - le cookie n’est **pas** accessible via `document.cookie` (HttpOnly)
- `GET /api/auth/me` renvoie l’utilisateur quand la session est valide
- Après logout/expiration :
  - `GET /api/auth/me` renvoie 401
  - l’accès aux routes protégées est refusé

## Références

- OWASP Session Management Cheat Sheet  
  https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP Authentication Cheat Sheet  
  https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- MDN Cookies (SameSite, Secure, HttpOnly)  
  https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies
- (Lecture critique) Why JWTs Are Bad for Sessions (Okta)  
  https://developer.okta.com/blog/2017/08/17/why-jwts-suck-as-session-tokens
- (Lecture critique) Stop Using JWT for Sessions (joepie91)  
  http://cryto.net/~joepie91/blog/2016/06/13/stop-using-jwt-for-sessions/