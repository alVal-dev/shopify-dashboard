# ADR 005 — Authentification pré-seedée (demo + user) & seed idempotent

## Contexte

Projet **portfolio** destiné à être exploré très rapidement (recruteur, pair). Deux options classiques :

1. **Inscription** : le visiteur crée un compte avant d’accéder au dashboard
2. **Comptes pré-seedés** : les comptes existent déjà, accès immédiat

Contraintes et objectifs :

- **Zéro friction** : permettre d’entrer dans l’app en quelques secondes.
- La base doit être initialisable facilement en local et en production (Supabase).
- Le seed doit être **rejouable** (dev, CI, redéploiement) **sans doublons**.
- Pas d’opérations destructrices par défaut (pas de wipe DB).
- L’auth cible utilise des **sessions via cookie HttpOnly** (pas de JWT) ; un compte demo doit être possible sans mot de passe.

---

## Décision

Mettre en place une authentification **pré-seedée**, supportée par un seed **idempotent** :

- **Compte demo** (`role=DEMO`) :
  - accès “1 clic” via un bouton _Explorer la démo_ ;
  - **aucun mot de passe** (`password = NULL`).
- **Compte standard** (`role=USER`) :
  - login email/mot de passe pour démontrer un flux d’auth classique ;
  - credentials affichés dans le README (démo publique assumée).
- Seed **idempotent** via `upsert` sur `users.email` (unique), **sans wipe**.
- Credentials seed **configurables via variables d’environnement** (avec valeurs par défaut adaptées à la démo) :
  - `DEMO_EMAIL`
  - `JOHN_EMAIL`
  - `JOHN_PASSWORD`
  - `BCRYPT_SALT_ROUNDS`
- Exécution du seed via Prisma :
  - `prisma db seed`
  - Prisma ORM v7 : commande seed déclarée dans `apps/api/prisma.config.ts` (`migrations.seed`).

---

## Conséquences

### Bénéfices

- **Aucune friction** : accès immédiat au dashboard.
- Pas de gestion d’onboarding (validation email, mot de passe oublié, anti-spam, etc.).
- Démonstration de **deux parcours** :
  - bouton demo
  - login classique
- Environnements faciles à reconstruire : seed relançable, reproductible.

### Inconvénients

- Pas de démonstration du parcours “inscription/onboarding”.
- **État partagé** : tous les visiteurs demo partagent le même utilisateur (ex : layouts qui peuvent s’écraser si le layout est stocké par user).

### Risques acceptés

- Le compte demo peut être “pollué” par des visiteurs : acceptable dans un sandbox portfolio.
- Les credentials du compte standard sont publics : intentionnel pour la démo.

---

## Alternatives considérées (rejetées)

### A) Inscription réelle + validation email

Rejeté car :

- complexité disproportionnée pour un portfolio ;
- nécessite un fournisseur d’email (SendGrid, etc.) ;
- augmente la friction pour le visiteur.

### B) Comptes temporaires auto-générés

Rejeté car :

- plus complexe (création, tracking, nettoyage) ;
- moins démonstratif d’un flux de login standard.

### C) Seed destructif (wipe + réinsertion)

Rejeté car :

- risqué en environnement partagé ;
- posture peu sérieuse pour une démo publique stable.

---

## Considérations de sécurité

- Compte demo sans mot de passe : acceptable uniquement car **sandbox** (pas de données réelles, pas d’actions destructrices).
- Des garde-fous sont attendus :
  - rate limiting,
  - limites SSE,
  - validation d’input,
  - messages d’erreur génériques.
- Secrets réels (DB URL, etc.) : **variables d’environnement uniquement**, jamais committés.

---

## Notes d’implémentation

Seed via `upsert` :

| Email (par défaut)           | Rôle   | Mot de passe (par défaut) |
| ---------------------------- | ------ | ------------------------- |
| `demo@shopify-dashboard.com` | `DEMO` | aucun (`NULL`)            |
| `john@example.com`           | `USER` | `password123` (hashé)     |

Fichiers :

- Seed : `apps/api/prisma/seed.ts`
- Config Prisma : `apps/api/prisma.config.ts` (`migrations.seed`)
- Schéma DB : `docs/data-model.md`
