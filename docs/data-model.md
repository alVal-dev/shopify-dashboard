# Data Model

Schema migrated from `apps/api/prisma/schema.prisma`.

| | |
|---|---|
| **Database** | PostgreSQL 16 |
| **ORM** | Prisma v7 |
| **Tables** | users, sessions, dashboard_layouts |
| **Enum** | user_role |

## Schema Overview

```
┌─────────────────────┐
│       users         │
├─────────────────────┤
│ id            PK    │
│ email         UK    │
│ password      ?     │
│ role          ENUM  │
│ created_at          │
│ updated_at          │
└─────────┬───────────┘
          │
          │ 1:N                    1:0..1
          ▼                           │
┌─────────────────────┐   ┌───────────▼───────────┐
│     sessions        │   │   dashboard_layouts   │
├─────────────────────┤   ├───────────────────────┤
│ id          PK      │   │ id            PK      │
│ session_id  UK      │   │ user_id       UK, FK  │
│ user_id     FK      │   │ config        JSONB   │
│ expires_at          │   │ created_at            │
│ created_at          │   │ updated_at            │
└─────────────────────┘   └───────────────────────┘
```

## Enum user_role

| Value | Description |
|-------|-------------|
| `DEMO` | Demo account, no password required |
| `USER` | Standard account, email/password auth |

## Table: users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| email | TEXT | UNIQUE, NOT NULL | Login identifier |
| password | TEXT | NULLABLE | Bcrypt hash, NULL for demo |
| role | user_role | NOT NULL, DEFAULT USER | Account type |
| created_at | TIMESTAMP | NOT NULL | Auto |
| updated_at | TIMESTAMP | NOT NULL | Auto (Prisma) |

**SQL Constraints**: `users_pkey(id)`, `users_email_key(email)`

## Table: sessions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Internal UUID |
| session_id | TEXT | UNIQUE, NOT NULL | Cookie token |
| user_id | TEXT | FK → users.id, NOT NULL | Owner |
| expires_at | TIMESTAMP | NOT NULL | TTL 24h |
| created_at | TIMESTAMP | NOT NULL | Auto |

**SQL Constraints**: `sessions_pkey(id)`, `sessions_session_id_key(session_id)`, `sessions_user_id_fkey(user_id) ON DELETE CASCADE`

**Indexes**: `sessions_user_id_idx`, `sessions_expires_at_idx`

## Table: dashboard_layouts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | Internal UUID |
| user_id | TEXT | UNIQUE, FK → users.id, NOT NULL | One layout per user |
| config | JSONB | NOT NULL | Widget configuration |
| created_at | TIMESTAMP | NOT NULL | Auto |
| updated_at | TIMESTAMP | NOT NULL | Auto (Prisma) |

**SQL Constraints**: `dashboard_layouts_pkey(id)`, `dashboard_layouts_user_id_key(user_id)`, `dashboard_layouts_user_id_fkey(user_id) ON DELETE CASCADE`

## Config JSON Structure

```json
[
  { "id": "w1", "type": "kpi", "position": { "x": 0, "y": 0, "w": 3, "h": 2 } },
  { "id": "w2", "type": "chart", "position": { "x": 3, "y": 0, "w": 6, "h": 4 } }
]
```

## Seed Data

Idempotent via `upsert`. Safe to re-run.

| Email | Role | Password |
|-------|------|----------|
| demo@shopify-dashboard.com | DEMO | none |
| john@example.com | USER | password123 |

```bash
pnpm -C apps/api exec prisma db seed
```

## Design Notes

- `session_id` is the cookie token; `id` is internal. Never expose PKs.
- `user_id` UNIQUE on layouts enforces 1:0..1 at DB level.
- CASCADE deletes clean up sessions and layouts automatically.
- JSONB config allows widget schema evolution without migrations.
