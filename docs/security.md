# Security

## Posture

Ce projet est un **bac à sable public** avec credentials affichés dans le README.
Les protections visent à démontrer les bonnes pratiques, pas à sécuriser des
données sensibles.

## Authentification

- Sessions cookie **HttpOnly**, **Secure** (en prod), **SameSite=Lax**
- SessionId opaque (crypto.randomUUID), pas de JWT
- Expiration 24h, validation à chaque requête
- Lazy delete des sessions expirées + CRON de nettoyage
- Passwords hashés avec bcrypt (10 rounds)
- Messages d'erreur génériques sur `/auth/login` (ne révèle pas si l'email existe)

Voir [ADR-002 : Session ID sans JWT](adr/002-session-id-sans-jwt.md)

## Rate Limiting

| Cible              | Limite         | Raison                       |
| ------------------ | -------------- | ---------------------------- |
| Toutes les routes  | 300 req/min/IP | Filet de sécurité anti-flood |
| `POST /auth/login` | 10 req/min/IP  | Anti brute-force             |
| `POST /auth/demo`  | 10 req/min/IP  | Anti spam de sessions        |

Implémentation : `@nestjs/throttler` avec guard global (`APP_GUARD`) et
overrides per-route via `@Throttle()`.

Store : in-memory (suffisant en mono-instance). Si scale-out, migrer vers un
store Redis.

## Trust Proxy

Configurable via la variable d'environnement `TRUST_PROXY_HOPS` :

| Environnement       | Valeur | Raison          |
| ------------------- | ------ | --------------- |
| Local (dev)         | `0`    | Pas de proxy    |
| Render              | `1`    | 1 reverse proxy |
| Cloudflare + Render | `2`    | 2 hops          |

Le défaut est `0` (ne trust personne). **Ne jamais utiliser `trust proxy: true`**
qui accepte n'importe quel header `X-Forwarded-For` (spoofable).

Sans cette configuration, le throttler voit l'IP du reverse proxy au lieu de
l'IP du client, ce qui bloquerait tous les utilisateurs après 300 requêtes
combinées.

## Validation des entrées

- `class-validator` via `ValidationPipe` global
- DTOs typés sur tous les endpoints qui acceptent un body

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
