# Security

## Posture

Ce projet est un **bac à sable public** avec credentials affichés dans le README.
Les protections visent à démontrer les bonnes pratiques, pas à sécuriser des
données sensibles.

## Authentification

- Sessions cookie **HttpOnly**, **Secure** (en prod), **SameSite=Lax**
- SessionId opaque (`crypto.randomUUID()`), pas de JWT
- Expiration 24h, validation à chaque requête
- Lazy delete des sessions expirées + CRON de nettoyage
- Passwords hashés avec bcrypt (10 rounds)
- Messages d'erreur génériques sur `/auth/login` (ne révèle pas si l'email existe)
- Le flux SSE (`GET /api/sse/events`) est protégé par le même mécanisme de session que l’API REST

Voir [ADR-002 : Session ID sans JWT](adr/002-session-id-sans-jwt.md)

## Rate Limiting

| Cible                   | Limite                | Raison                                              |
| ----------------------- | --------------------- | --------------------------------------------------- |
| Toutes les routes       | 300 req/min/IP        | Filet de sécurité anti-flood                        |
| `POST /auth/login`      | 10 req/min/IP         | Anti brute-force                                    |
| `POST /auth/demo`       | 10 req/min/IP         | Anti spam de sessions                               |
| `PUT /dashboard/layout` | 5 req/min/**session** | Protège l’auto-save (drag/resize), évite le spam DB |

Implémentation :

- `@nestjs/throttler` avec guard global (`APP_GUARD`) et overrides per-route via `@Throttle()`.
- Pour `PUT /dashboard/layout`, le rate limit est **par session** (cookie `sessionId`) via un guard dédié
  utilisant le storage du throttler (clé `dashboard-layout-save:<sessionId>`), plutôt que le tracker IP par défaut.

Store : in-memory (suffisant en mono-instance). Si scale-out, migrer vers un
store Redis.

## SSE (temps réel)

Le flux SSE est exposé via `GET /api/sse/events` sur le même origin que le reste de l’application.

### Contrôle d’accès

- Endpoint **protégé par session** (`AuthGuard`)
- Même règle pour :
  - comptes `USER`
  - compte `DEMO`
- Les sessions démo ont accès au SSE
- L’isolation du flux se fait par **`sessionId`**, pas par rôle ni par `userId`

### Limite dédiée SSE

En plus du throttling global, le SSE applique une **limite spécifique de connexions actives** :

| Cible                 | Limite                   | Raison                                                        |
| --------------------- | ------------------------ | ------------------------------------------------------------- |
| `GET /api/sse/events` | 10 connexions actives/IP | Protège la démo publique contre les flux longue durée abusifs |

Règles :

- toutes les connexions ouvertes comptent dans cette limite ;
- plusieurs onglets d’une même session comptent chacun comme une connexion active ;
- si la limite est atteinte, le serveur répond **`204 No Content`** et **n’ouvre pas** le flux SSE ;
- cette limite est **indépendante** du throttling global `@nestjs/throttler`.

### Pourquoi `204` ?

Le `204` est utilisé pour éviter d’ouvrir un faux flux SSE quand la limite est atteinte.
Le client ne peut alors pas consommer de flux temps réel tant qu’une autre connexion active de la même IP n’a pas été libérée.

### Politique de reconnexion côté client

Le frontend applique une logique défensive de reconnexion :

- reconnexion automatique via `EventSource`
- backoff exponentiel borné côté composable frontend
- watchdog côté client si le flux devient silencieux
- état de connexion exposé :
  - `connected`
  - `reconnecting`
  - `disconnected`

### Politique de replay

Le projet **ne supporte pas** :

- le replay des événements SSE manqués
- `Last-Event-ID`

Règle retenue :

- **REST = source de vérité initiale et de resynchronisation**
- **SSE = flux live non rejoué**

Conséquence :

- après reconnexion, le frontend relance des appels REST métier (`orders`, `analytics`) pour retrouver un état cohérent ;
- le feed temps réel reste **best-effort** et non exhaustif.

## Trust Proxy

Configurable via la variable d'environnement `TRUST_PROXY_HOPS` :

| Environnement       | Valeur | Raison          |
| ------------------- | ------ | --------------- |
| Local (dev)         | `0`    | Pas de proxy    |
| Render              | `1`    | 1 reverse proxy |
| Cloudflare + Render | `2`    | 2 hops          |

Le défaut est `0` (ne trust personne). **Ne jamais utiliser `trust proxy: true`**
qui accepte n'importe quel header `X-Forwarded-For` (spoofable).

Sans cette configuration :

- le throttler verrait l'IP du reverse proxy au lieu de l'IP du client ;
- la **limite SSE active par IP** compterait aussi de mauvaises IP ;
- plusieurs utilisateurs pourraient être bloqués à tort derrière le même proxy apparent.

## Validation des entrées

- `class-validator` via `ValidationPipe` global
- DTOs typés sur tous les endpoints qui acceptent un body

## Persistance du dashboard (sandbox)

- Le layout est stocké en base dans `dashboard_layouts.config` (JSON) pour les comptes `USER`.
- **Mode démo (`role=DEMO`)** : la persistance du layout est **désactivée**.
  - `PUT /dashboard/layout` retourne **403 Forbidden**.
  - L’UI affiche un message indiquant que la persistance est désactivée en mode démo.
  - Objectif : éviter que des visiteurs se marchent dessus (un seul user demo partagé en sandbox publique).

### Impact sur le SSE

- Le mode démo **garde l’accès au SSE**
- Le mode démo **ne change pas** la logique temps réel
- La seule restriction spécifique à la démo reste l’absence de persistance backend du layout

## En dehors du scope

Ce projet étant un bac à sable :

- Pas de HTTPS forcé (géré par Render)
- Pas de CORS (même origin : le backend sert le SPA)
- Pas de CSP headers (pas de données utilisateur réelles)
- Pas de WAF

## Nettoyage des sessions

Deux mécanismes complémentaires :

| Mécanisme        | Déclencheur                        | Fiabilité                           |
| ---------------- | ---------------------------------- | ----------------------------------- |
| **Lazy delete**  | Chaque appel à `validateSession()` | Garanti — c'est la vraie protection |
| **CRON horaire** | `@nestjs/schedule`, `EVERY_HOUR`   | Best-effort — le PaaS peut dormir   |

Le CRON empêche l'accumulation de lignes mortes en base. Il n'est pas
critique pour la sécurité : une session expirée est déjà rejetée par
`validateSession()` avant d'être supprimée en lazy delete.
