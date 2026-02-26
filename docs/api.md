
# API — Shopify Analytics Dashboard

## Vue d’ensemble

L’API REST est servie par NestJS sous le préfixe `/api`. Les réponses sont en JSON.

**Base URL**
- Développement : `http://localhost:3000/api`
- Production : `https://<app>.onrender.com/api`

**Swagger (dev)** : `http://localhost:3000/docs`


---

## Conventions

### Format des réponses
La plupart des endpoints renvoient un wrapper :

```json
{
  "data": {}
}
```

### Gestion des erreurs
Les erreurs sont normalisées via le filtre global `AllExceptionsFilter` (format `ApiErrorResponse`).

Exemple (401) :

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

Erreurs de validation (400) :

```json
{
  "statusCode": 400,
  "message": ["email must be an email", "password must be at least 8 characters"],
  "error": "Bad Request"
}
```

---

## Authentification

L’API utilise des **sessions serveur** via cookie HttpOnly. Voir [ADR 002](adr/002-session-id-sans-jwt.md) pour la décision et les justifications.

### Mécanisme
1. Le client appelle `POST /api/auth/login` ou `POST /api/auth/demo`
2. Le serveur crée une session en DB et pose un cookie `sessionId`
3. Les requêtes suivantes incluent automatiquement le cookie (client Axios : `withCredentials: true`)
4. Le serveur valide la session à chaque requête protégée (`expiresAt` enforce côté serveur)

### Cookie `sessionId`

| Attribut | Valeur |
|----------|--------|
| Nom | `sessionId` |
| HttpOnly | `true` |
| Secure | `true` en production (HTTPS) |
| SameSite | `Lax` |
| Path | `/` |
| Expiration | 24 heures |

### Client-side (frontend)
```ts
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});
```

---

## Rate Limiting

L’API utilise `@nestjs/throttler`.

| Scope | Limite | Cible |
|-------|--------|-------|
| Global | 300 req/min/IP | Toutes les routes |
| Auth login | 10 req/min/IP | `POST /api/auth/login` |
| Auth demo | 10 req/min/IP | `POST /api/auth/demo` |

Réponse 429 (exemple) :

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

> Selon version/config, des headers de rate limiting peuvent être présents (ex. `Retry-After`). Se référer au comportement effectif observé en environnement.

---

## Endpoints

### Health Check

#### `GET /api/health`
Vérifie que l’API est opérationnelle.

- **Authentification** : non requise
- **Rate limit** : global (300 req/min/IP)

Réponse 200 :

```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## Auth

### `POST /api/auth/demo`
Crée une session pour l’utilisateur démo. Permet d’explorer l’application sans credentials.

- **Authentification** : non requise
- **Rate limit** : 10 req/min/IP
- **Body** : aucun

Réponse 200 :

```json
{
  "data": {
    "id": "uuid",
    "email": "demo@example.com",
    "role": "demo"
  }
}
```

Headers (exemple) :

```
Set-Cookie: sessionId=<uuid>; HttpOnly; SameSite=Lax; Path=/; Expires=<date>
```

Erreurs possibles :

| Status | Description |
|--------|-------------|
| 429 | Too Many Requests (rate limit dépassé) |
| 500 | Demo user not found (seed manquant) |

---

### `POST /api/auth/login`
Authentifie un utilisateur avec email et mot de passe. Crée une session et pose le cookie.

- **Authentification** : non requise
- **Rate limit** : 10 req/min/IP

Body :

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

Validation :

| Champ | Type | Validation |
|-------|------|------------|
| email | string | format email |
| password | string | min 8 caractères |

Réponse 200 :

```json
{
  "data": {
    "id": "uuid",
    "email": "john@example.com",
    "role": "user"
  }
}
```

Erreurs possibles :

| Status | Description |
|--------|-------------|
| 400 | Bad Request (validation échouée) |
| 401 | Invalid email or password (message générique) |
| 429 | Too Many Requests |

> Note sécurité : le message 401 est volontairement générique pour ne pas révéler si l’email existe.

---

### `GET /api/auth/me`
Retourne l’utilisateur connecté à partir du cookie `sessionId`.

- **Authentification** : requise (cookie `sessionId`)
- **Rate limit** : global (300 req/min/IP)
- **Body** : aucun

Réponse 200 :

```json
{
  "data": {
    "id": "uuid",
    "email": "john@example.com",
    "role": "user"
  }
}
```

Erreurs possibles :

| Status | Description |
|--------|-------------|
| 401 | Not authenticated (cookie absent, session invalide ou expirée) |

> Côté frontend, cet endpoint est appelé au boot via `checkAuth()` avec une option `silent401` (pour éviter une redirection automatique lors de l’initialisation).

---

### `POST /api/auth/logout`
Supprime la session en cours et efface le cookie.

- **Authentification** : optionnelle (best-effort si cookie présent)
- **Rate limit** : global (300 req/min/IP)
- **Body** : aucun

Réponse 200 :

```json
{
  "data": {
    "ok": true
  }
}
```

Headers (exemple) :

```
Set-Cookie: sessionId=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0
```

> Note : l’endpoint est best-effort et vise à être idempotent côté client.

---

## Types partagés (référence)

Les types TypeScript partagés sont dans `shared/types/` et utilisés par le backend et le frontend.

### `AuthUser`
```ts
interface AuthUser {
  id: string;
  email: string;
  role: 'demo' | 'user';
}
```

### `ApiResponse<T>`
```ts
interface ApiResponse<T> {
  data: T;
}
```

### `ApiErrorResponse`
```ts
interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp?: string;
}
```

---

## Test avec cURL

### Login démo
```bash
curl -X POST http://localhost:3000/api/auth/demo \
  -c cookies.txt \
  -v
```

### Login credentials
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}' \
  -c cookies.txt \
  -v
```

### Get current user
```bash
curl http://localhost:3000/api/auth/me \
  -b cookies.txt
```

### Logout
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt \
  -c cookies.txt
```

### Test rate limiting (auth demo)
```bash
# 11 requêtes rapides sur demo -> la 11ème retourne 429
for i in $(seq 1 11); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3000/api/auth/demo
done
```
