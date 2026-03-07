# API — Shopify Analytics Dashboard

## Vue d’ensemble

L’API REST est servie par NestJS sous le préfixe `/api`. Les réponses sont en JSON.

**Base URL**

- Développement : `http://localhost:3000/api`
- Production : `https://<app>.onrender.com/api`

**Swagger (hors production)** : `http://localhost:3000/docs`

---

## Conventions

### Format des réponses

La plupart des endpoints renvoient un wrapper :

```json
{
  "data": {}
}
```

Exception actuelle :

- `GET /api/health` retourne un objet simple sans wrapper.

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
  "message": ["email must be an email", "password must be longer than or equal to 8 characters"],
  "error": "Bad Request"
}
```

---

## Authentification

L’API utilise des **sessions serveur** via cookie HttpOnly. Voir [ADR 002](adr/002-session-id-sans-jwt.md).

### Mécanisme

1. Le client appelle `POST /api/auth/login` ou `POST /api/auth/demo`
2. Le serveur crée une session en base et pose un cookie `sessionId`
3. Les requêtes suivantes incluent automatiquement le cookie
4. Le serveur valide la session à chaque requête protégée

### Cookie `sessionId`

| Attribut   | Valeur                       |
| ---------- | ---------------------------- |
| Nom        | `sessionId`                  |
| HttpOnly   | `true`                       |
| Secure     | `true` en production (HTTPS) |
| SameSite   | `Lax`                        |
| Path       | `/`                          |
| Expiration | 24 heures                    |

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

| Scope       | Limite            | Cible                       |
| ----------- | ----------------- | --------------------------- |
| Global      | 300 req/min/IP    | Toutes les routes           |
| Auth login  | 10 req/min/IP     | `POST /api/auth/login`      |
| Auth demo   | 10 req/min/IP     | `POST /api/auth/demo`       |
| Layout save | 5 req/min/session | `PUT /api/dashboard/layout` |

### Notes

- Le throttling global et auth est basé sur l’IP.
- Le throttling de sauvegarde du layout est basé sur le `sessionId`.
- `PUT /api/dashboard/layout` renvoie des headers de rate limiting (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) et `Retry-After` en cas de blocage.

Exemple 429 :

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

---

## Endpoints

## Health Check

### `GET /api/health`

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

Crée une session pour l’utilisateur démo.

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

Erreurs possibles :

| Status | Description                                |
| ------ | ------------------------------------------ |
| 429    | Rate limit dépassé                         |
| 500    | Utilisateur démo introuvable (seed absent) |

---

### `POST /api/auth/login`

Authentifie un utilisateur avec email et mot de passe.

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

| Champ    | Type   | Validation       |
| -------- | ------ | ---------------- |
| email    | string | format email     |
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

| Status | Description                    |
| ------ | ------------------------------ |
| 400    | Validation échouée             |
| 401    | Email ou mot de passe invalide |
| 429    | Rate limit dépassé             |

> Le message 401 reste volontairement générique.

---

### `GET /api/auth/me`

Retourne l’utilisateur connecté.

- **Authentification** : requise
- **Rate limit** : global (300 req/min/IP)

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

| Status | Description     |
| ------ | --------------- |
| 401    | Non authentifié |

---

### `POST /api/auth/logout`

Supprime la session en cours et efface le cookie.

- **Authentification** : optionnelle (best-effort)
- **Rate limit** : global (300 req/min/IP)

Réponse 200 :

```json
{
  "data": {
    "ok": true
  }
}
```

---

## Mock Shopify Data

Ces endpoints sont protégés par session.

## Orders

### `GET /api/orders`

Retourne une liste paginée de commandes mockées.

- **Authentification** : requise
- **Rate limit** : global (300 req/min/IP)

Query params principaux :

| Paramètre | Type            | Description                    |
| --------- | --------------- | ------------------------------ |
| page      | number          | page courante                  |
| limit     | number          | taille de page                 |
| sortBy    | string          | champ de tri                   |
| sortOrder | `asc` \| `desc` | sens du tri                    |
| status    | string          | filtre sur le statut financier |

Réponse 200 :

```json
{
  "data": {
    "items": [],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 80,
      "totalPages": 8
    }
  }
}
```

---

## Products

### `GET /api/products`

Retourne une liste paginée de produits mockés.

- **Authentification** : requise
- **Rate limit** : global (300 req/min/IP)

Réponse 200 :

```json
{
  "data": {
    "items": [],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 24,
      "totalPages": 3
    }
  }
}
```

---

## Customers

### `GET /api/customers`

Retourne une liste paginée de clients mockés.

- **Authentification** : requise
- **Rate limit** : global (300 req/min/IP)

Réponse 200 :

```json
{
  "data": {
    "items": [],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 80,
      "totalPages": 8
    }
  }
}
```

---

## Analytics

### `GET /api/analytics`

Retourne un snapshot analytique agrégé.

- **Authentification** : requise
- **Rate limit** : global (300 req/min/IP)

Réponse 200 :

```json
{
  "data": {
    "kpis": {
      "revenue": {
        "valueCents": 5415072,
        "deltaPercent": 12.4
      },
      "orders": {
        "value": 128,
        "deltaPercent": 8.1
      },
      "averageOrderValue": {
        "valueCents": 42305,
        "deltaPercent": -1.8
      },
      "customers": {
        "value": 80,
        "deltaPercent": 5.2
      }
    },
    "salesTrend": [],
    "topProducts": []
  }
}
```

---

## Dashboard Layout

## `GET /api/dashboard/layout`

Retourne la disposition du tableau de bord pour l’utilisateur connecté.

- **Authentification** : requise
- **Rate limit** : global (300 req/min/IP)

Comportement :

- si un layout est déjà enregistré pour l’utilisateur, il est renvoyé ;
- sinon, le backend renvoie le layout par défaut.

Réponse 200 :

```json
{
  "data": {
    "widgets": [
      {
        "id": "kpi-1",
        "type": "kpi-cards",
        "title": "Indicateurs clés",
        "position": {
          "x": 0,
          "y": 0,
          "w": 6,
          "h": 2
        }
      },
      {
        "id": "trend-1",
        "type": "revenue-trend",
        "title": "Tendance du chiffre d'affaires",
        "position": {
          "x": 6,
          "y": 0,
          "w": 6,
          "h": 2
        }
      }
    ]
  }
}
```

Erreurs possibles :

| Status | Description     |
| ------ | --------------- |
| 401    | Non authentifié |

---

## `PUT /api/dashboard/layout`

Sauvegarde le layout complet de l’utilisateur connecté.

- **Authentification** : requise
- **Rate limit** : 5 req/min/session

Body :

```json
{
  "widgets": [
    {
      "id": "kpi-1",
      "type": "kpi-cards",
      "title": "Indicateurs clés",
      "position": {
        "x": 0,
        "y": 0,
        "w": 6,
        "h": 2
      }
    }
  ]
}
```

Comportement :

- sauvegarde en upsert ;
- un seul layout par utilisateur ;
- le compte démo ne peut pas sauvegarder.

Réponse 200 :

```json
{
  "data": {
    "widgets": [
      {
        "id": "kpi-1",
        "type": "kpi-cards",
        "title": "Indicateurs clés",
        "position": {
          "x": 0,
          "y": 0,
          "w": 6,
          "h": 2
        }
      }
    ]
  }
}
```

Erreurs possibles :

| Status | Description                      |
| ------ | -------------------------------- |
| 400    | Validation échouée               |
| 401    | Non authentifié                  |
| 403    | Compte démo : sauvegarde refusée |
| 429    | Rate limit dépassé               |

---

## Types partagés (référence)

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

### `DashboardLayout`

```ts
type WidgetType = 'kpi-cards' | 'revenue-trend' | 'orders-table' | 'top-products' | 'realtime-feed';

interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  position: WidgetPosition;
}

interface DashboardLayout {
  widgets: WidgetConfig[];
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

### Get dashboard layout

```bash
curl http://localhost:3000/api/dashboard/layout \
  -b cookies.txt
```

### Save dashboard layout

```bash
curl -X PUT http://localhost:3000/api/dashboard/layout \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"widgets":[{"id":"kpi-1","type":"kpi-cards","title":"Indicateurs clés","position":{"x":0,"y":0,"w":6,"h":2}}]}'
```

### Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt \
  -c cookies.txt
```

### Test rate limiting layout

```bash
for i in $(seq 1 6); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X PUT http://localhost:3000/api/dashboard/layout \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d '{"widgets":[{"id":"kpi-1","type":"kpi-cards","title":"Indicateurs clés","position":{"x":0,"y":0,"w":6,"h":2}}]}'
done
```
