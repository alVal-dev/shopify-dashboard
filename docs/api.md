# API — Shopify Analytics Dashboard

## Vue d’ensemble

L’API REST est servie par NestJS sous le préfixe `/api`. Les réponses sont en JSON.

Le flux SSE est également servi sous le préfixe `/api`, sur le même origin que l’API REST en production.

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
- `GET /api/sse/events` ouvre un flux SSE et ne suit pas le format `ApiResponse<T>`.

### Gestion des erreurs

Les erreurs sont normalisées via le filtre global `AllExceptionsFilter` (format `ApiErrorResponse`).

Exemple (401) :

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "UnauthorizedException",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "path": "/api/auth/me"
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
- Le SSE conserve le throttling global normal, **mais ajoute aussi une limite dédiée de 10 connexions actives par IP**.

Exemple 429 :

```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "error": "ThrottlerException",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "path": "/api/dashboard/layout"
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
    "email": "demo@shopify-dashboard.com",
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
    "data": [],
    "total": 80,
    "page": 1,
    "limit": 10,
    "totalPages": 8
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
    "data": [],
    "total": 24,
    "page": 1,
    "limit": 10,
    "totalPages": 3
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
    "data": [],
    "total": 80,
    "page": 1,
    "limit": 10,
    "totalPages": 8
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
      "revenueCents": 5415072,
      "revenueChange": 12,
      "ordersCount": 128,
      "ordersCountChange": 8,
      "averageOrderValueCents": 42305,
      "averageOrderValueChange": -2,
      "customersCount": 80,
      "customersCountChange": 5
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
          "h": 3
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
          "h": 3
        }
      },
      {
        "id": "orders-1",
        "type": "orders-table",
        "title": "Commandes récentes",
        "position": {
          "x": 0,
          "y": 2,
          "w": 6,
          "h": 3
        }
      },
      {
        "id": "products-1",
        "type": "top-products",
        "title": "Top produits",
        "position": {
          "x": 6,
          "y": 2,
          "w": 6,
          "h": 3
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
        "h": 3
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
          "h": 3
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

---

## Export CSV

### `GET /api/export/:type`

Exporte les données de la session courante au format CSV.

- **Authentification** : requise
- **Rate limit** : global (300 req/min/IP)

Paramètre de route :

| Paramètre | Type   | Valeurs acceptées                 |
| --------- | ------ | --------------------------------- |
| type      | string | `orders`, `products`, `customers` |

Comportement :

- retourne un fichier CSV avec BOM UTF-8 ;
- séparateur : `;` ;
- fin de ligne : `\r\n` ;
- nom du fichier : `{type}-{YYYY-MM-DD}.csv` ;
- les cellules contenant `;`, `"`, `\n` ou `\r` sont échappées entre guillemets ;
- les guillemets internes sont doublés (`""`) ;
- les montants sont formatés en décimales (ex : `150.50`) ;
- les dates sont formatées en UTC (ex : `2026-03-10 14:30:00 UTC`) ;
- si une date source est invalide, la valeur brute est conservée.

Headers de réponse :

| Header              | Valeur                                     |
| ------------------- | ------------------------------------------ |
| Content-Type        | `text/csv; charset=utf-8`                  |
| Content-Disposition | `attachment; filename="{type}-{date}.csv"` |

Réponse 200 : corps binaire CSV.

Erreurs possibles :

| Status | Description                |
| ------ | -------------------------- |
| 400    | Type d'export non supporté |
| 401    | Non authentifié            |

### Colonnes par type

**orders** (11 colonnes) :

| Colonne            | Source              | Format      |
| ------------------ | ------------------- | ----------- |
| Order Number       | `orderNumber`       | entier      |
| Customer           | `customerName`      | texte       |
| Email              | `email`             | texte       |
| Total              | `totalPriceCents`   | décimal (€) |
| Currency           | `currency`          | texte       |
| Financial Status   | `financialStatus`   | texte       |
| Fulfillment Status | `fulfillmentStatus` | texte       |
| Items              | `lineItems.length`  | entier      |
| City               | `shippingCity`      | texte       |
| Country            | `shippingCountry`   | texte       |
| Date               | `createdAt`         | UTC formaté |

**products** (6 colonnes) :

| Colonne         | Source            | Format      |
| --------------- | ----------------- | ----------- |
| Title           | `title`           | texte       |
| Vendor          | `vendor`          | texte       |
| Type            | `productType`     | texte       |
| Variants        | `variants.length` | entier      |
| Total Inventory | `totalInventory`  | entier      |
| Created         | `createdAt`       | UTC formaté |

**customers** (9 colonnes) :

| Colonne     | Source            | Format      |
| ----------- | ----------------- | ----------- |
| First Name  | `firstName`       | texte       |
| Last Name   | `lastName`        | texte       |
| Email       | `email`           | texte       |
| Orders      | `ordersCount`     | entier      |
| Total Spent | `totalSpentCents` | décimal (€) |
| Segment     | `segment`         | texte       |
| City        | `city`            | texte       |
| Country     | `country`         | texte       |
| Created     | `createdAt`       | UTC formaté |

Exemple cURL export
Où le mettre : dans la section "Test avec cURL", après le bloc "Get dashboard layout" et avant le bloc "Save dashboard layout".

### Export CSV orders

```bash
curl http://localhost:3000/api/export/orders \
  -b cookies.txt \
  -o orders.csv
```

### Export CSV products

```bash
curl http://localhost:3000/api/export/products \
  -b cookies.txt \
  -o products.csv
```

### Export CSV customers

```bash
curl http://localhost:3000/api/export/customers \
  -b cookies.txt \
  -o customers.csv
```

---

## Server-Sent Events (SSE)

Le dashboard consomme un flux temps réel via SSE (Server-Sent Events).

## `GET /api/sse/events`

Ouvre un flux SSE authentifié.

- **Authentification** : requise
- **Cookie requis** : `sessionId`
- **Rate limit** : throttling global normal + **limite dédiée de 10 connexions SSE actives par IP**
- **Sessions démo** : autorisées
- **Content-Type** : `text/event-stream`

### Comportement

- le flux reste ouvert tant que le client est connecté ;
- plusieurs onglets d’une même session sont autorisés ;
- les connexions SSE sont comptées individuellement dans la limite IP ;
- si la limite de **10 connexions actives par IP** est atteinte, le serveur répond **204 No Content** et n’ouvre pas le flux ;
- il n’y a **pas de replay** des événements manqués ;
- il n’y a **pas de support `Last-Event-ID`**.

### Règle de cohérence

- **REST = source de vérité initiale et de resynchronisation**
- **SSE = flux live non rejoué**

En pratique :

- le frontend charge d’abord l’état initial via REST ;
- puis ouvre le flux SSE ;
- après reconnexion SSE, le frontend peut relancer des appels REST pour se resynchroniser.

### Événements émis

#### `order.created`

Payload : `Order`

Exemple :

```txt
event: order.created
data: {"id":"...","orderNumber":1452,"customerId":"...","email":"client@example.com","customerName":"Jean Dupont","totalPriceCents":12900,"currency":"EUR","financialStatus":"paid","fulfillmentStatus":"fulfilled","lineItems":[...],"shippingCity":"Paris","shippingCountry":"France","createdAt":"2026-03-12T10:12:00.000Z"}
```

#### `analytics.updated`

Payload : `AnalyticsSnapshot`

Exemple :

```txt
event: analytics.updated
data: {"kpis":{"revenueCents":5421000,"revenueChange":12,"ordersCount":131,"ordersCountChange":8,"averageOrderValueCents":41382,"averageOrderValueChange":-2,"customersCount":82,"customersCountChange":5},"salesTrend":[...],"topProducts":[...]}
```

#### `stock.alert`

Payload :

```json
{
  "id": "uuid",
  "productId": "uuid",
  "variantId": "uuid",
  "productTitle": "T-shirt Oversize",
  "variantTitle": "Noir / L",
  "sku": "TEE-OVR-BLK-L",
  "inventoryQuantity": 3,
  "threshold": 5,
  "occurredAt": "2026-03-12T10:14:00.000Z"
}
```

Exemple :

```txt
event: stock.alert
data: {"id":"...","productId":"...","variantId":"...","productTitle":"T-shirt Oversize","variantTitle":"Noir / L","sku":"TEE-OVR-BLK-L","inventoryQuantity":3,"threshold":5,"occurredAt":"2026-03-12T10:14:00.000Z"}
```

#### `heartbeat`

Payload :

```json
{
  "sentAt": "2026-03-12T10:15:00.000Z"
}
```

Exemple :

```txt
event: heartbeat
data: {"sentAt":"2026-03-12T10:15:00.000Z"}
```

### Erreurs / cas particuliers

| Status | Description                                      |
| ------ | ------------------------------------------------ |
| 401    | Session invalide ou absente                      |
| 204    | Limite de connexions SSE actives par IP atteinte |

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
  error: string;
  timestamp: string;
  path: string;
  requestId?: string;
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

### Ouvrir le flux SSE

```bash
curl -N http://localhost:3000/api/sse/events \
  -b cookies.txt
```

### Vérifier la limite 10/IP

```bash
for i in $(seq 1 10); do
  curl -N http://localhost:3000/api/sse/events -b cookies.txt > /dev/null &
done

curl -i -N http://localhost:3000/api/sse/events -b cookies.txt
```

Attendu pour la dernière connexion :

- `204 No Content`

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
