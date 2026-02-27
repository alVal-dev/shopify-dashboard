# ADR 001 — Monorepo pnpm workspaces sans Turborepo

## Statut

Accepté

## Date

19-02-2026

## Contexte

Le projet Shopify Analytics Dashboard est composé de deux applications (NestJS API et Vue 3 SPA) et d'un package de types partagés. La question se pose de l'outil d'orchestration du monorepo.

Deux options principales existent dans l'écosystème :

1. **pnpm workspaces seul** — gestion native des dépendances et des scripts cross-packages
2. **Turborepo** (ou Nx) — orchestrateur de monorepo avec cache de builds, parallélisation intelligente et graphe de dépendances

## Décision

Utiliser **pnpm workspaces seul**, sans Turborepo ni Nx.

## Options considérées

### Option A — pnpm workspaces seul

**Avantages :**

- Zéro dépendance supplémentaire, zéro configuration supplémentaire
- Les scripts `--parallel` et `--filter` de pnpm couvrent les besoins du projet
- Courbe d'apprentissage nulle pour quiconque connaît npm/pnpm
- Debugging simple : pas de couche d'abstraction entre les commandes et leur exécution

**Inconvénients :**

- Pas de cache de build intelligent (chaque `pnpm build` rebuild tout)
- Pas de détection automatique des dépendances entre packages pour l'ordre de build
- Pas de remote caching pour la CI

### Option B — Turborepo

**Avantages :**

- Cache local et remote des builds (gain de temps en CI)
- Graphe de dépendances automatique (build dans le bon ordre)
- Parallélisation intelligente basée sur les dépendances
- Commande `turbo run` unifiée

**Inconvénients :**

- Dépendance supplémentaire à installer et maintenir
- Fichier `turbo.json` à configurer et synchroniser avec les scripts
- Overhead cognitif : comprendre le cache, les inputs/outputs, les pipelines
- Debugging plus complexe quand le cache produit des résultats inattendus

### Option C — Nx

**Avantages :**

- Fonctionnalités similaires à Turborepo avec un écosystème de plugins plus riche
- Génération de code et migrations automatiques

**Inconvénients :**

- Complexité significativement plus élevée que Turborepo
- Configuration lourde pour un petit projet
- Forte opinion sur la structure du projet

## Justification

Le projet contient **2 applications et 1 package de types**. À cette échelle :

- Le build complet (frontend + backend) prend moins de 30 secondes. Le cache de Turborepo économiserait quelques secondes, ce qui ne justifie pas la complexité ajoutée.
- L'ordre de build est trivial et explicite : `pnpm --filter web build && pnpm --filter api build`. Pas besoin d'un graphe de dépendances automatique.
- Le projet est développé par une seule personne. Le remote caching en CI n'apporte pas de valeur significative.
- La CI GitHub Actions exécute déjà les étapes dans l'ordre (lint → typecheck → test → build). Turborepo n'ajouterait rien ici.

Le rapport **valeur ajoutée / complexité** de Turborepo est défavorable pour ce projet. Si le monorepo grandissait au-delà de 5 packages ou si le temps de build dépassait plusieurs minutes, cette décision serait à réévaluer.

## Conséquences

- Les scripts du `package.json` racine utilisent `pnpm --parallel --filter` pour orchestrer les commandes
- L'ordre de build est géré manuellement dans le script `build` (frontend avant backend car NestJS sert le SPA buildé)
- Pas de cache de build : chaque CI run rebuild tout depuis zéro
- Structure simple et explicite, accessible à tout développeur sans connaissance spécifique d'un outil de monorepo
