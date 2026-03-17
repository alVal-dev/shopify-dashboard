# ADR 003 — SSE vs WebSocket pour le temps réel

## Statut

Accepté

## Contexte

Le dashboard doit afficher une activité temps réel simulée pour rendre la démo plus vivante :

- nouvelles commandes
- mise à jour des analytics
- alertes de stock
- heartbeat de supervision côté client

Le besoin produit est volontairement limité :

- flux **serveur → client uniquement**
- pas de chat
- pas de collaboration temps réel
- pas d’édition concurrente
- pas de messages client → serveur en continu

Le projet est un **portfolio full-stack** avec peu d’évolutions prévues après finalisation.
L’objectif principal est de démontrer une architecture claire, crédible et proportionnée au besoin.

## Décision

Le projet utilise **Server-Sent Events (SSE)** et **n’utilise pas WebSocket**.

Endpoint retenu :

- `GET /api/sse/events`

Le frontend ouvre un flux SSE authentifié après chargement du dashboard.
Le backend pousse des événements simulés vers chaque session active.

## Pourquoi SSE

### 1. Le besoin est unidirectionnel

Le serveur doit uniquement pousser des événements au client :

- `order.created`
- `analytics.updated`
- `stock.alert`
- `heartbeat`

Le client n’a pas besoin d’envoyer des messages temps réel au serveur.
Le modèle SSE correspond donc exactement au besoin fonctionnel.

### 2. Simplicité d’intégration

SSE est plus simple à mettre en place que WebSocket dans ce contexte :

- API HTTP classique
- pas de protocole bidirectionnel supplémentaire
- intégration naturelle avec le cookie de session existant
- comportement lisible côté backend NestJS
- consommation simple côté frontend via `EventSource`

### 3. Cohérence avec l’architecture mono-origin

Le projet vise une architecture simple où :

- le backend sert le frontend
- l’API REST et le flux temps réel partagent le même origin
- l’auth repose sur un cookie HttpOnly de session

SSE s’intègre bien à cette stratégie sans complexifier inutilement la sécurité.

### 4. Coût de maintenance plus faible

Pour un projet portfolio figé, SSE offre un meilleur ratio :

- valeur démonstrative élevée
- complexité technique contenue
- observabilité et debug plus simples
- moins de logique d’infrastructure qu’un vrai canal WebSocket

## Pourquoi pas WebSocket

WebSocket aurait été pertinent si le produit nécessitait :

- bidirectionnel temps réel
- collaboration multi-utilisateurs
- commandes client → serveur très fréquentes
- synchronisation temps réel complexe
- réduction extrême de la latence sur de nombreux échanges

Ce n’est pas le cas ici.

Dans ce projet, WebSocket aurait surtout introduit :

- plus de surface technique
- plus de complexité de test
- plus de code de reconnexion/gestion d’état
- une sophistication peu justifiée par le besoin réel

## Conséquences

### Positives

- implémentation plus simple
- sécurité cohérente avec l’auth par session cookie
- logique lisible côté frontend et backend
- bonne démonstration “temps réel” pour un portfolio
- coût de test raisonnable

### Négatives / limites

- flux uniquement serveur → client
- pas de canal temps réel bidirectionnel
- pas de support des usages collaboratifs avancés
- pas de replay des événements manqués
- pas de support `Last-Event-ID`
- la reconnexion côté client reste best-effort avec resynchronisation REST

## Règle d’architecture retenue

Le projet applique la règle suivante :

- **REST = source de vérité initiale et resynchronisation**
- **SSE = flux live non rejoué**

En pratique :

1. le frontend charge l’état initial via REST ;
2. il ouvre ensuite le flux SSE ;
3. si la connexion SSE est perdue puis rétablie, le frontend peut relancer des appels REST pour se resynchroniser.

## Alternatives considérées

### Option A — Polling HTTP

#### Avantages

- très simple conceptuellement
- aucun flux persistant

#### Inconvénients

- moins démonstratif pour un dashboard temps réel
- plus de trafic inutile
- latence moins naturelle
- expérience moins “vivante”

#### Verdict

Non retenu.

### Option B — WebSocket

#### Avantages

- vrai bidirectionnel
- très flexible
- adapté aux usages temps réel complexes

#### Inconvénients

- surdimensionné pour ce besoin
- plus coûteux en implémentation et en test
- complexité produit non justifiée

#### Verdict

Non retenu.

### Option C — SSE

#### Avantages

- parfaitement adapté au flux serveur → client
- simple à intégrer avec l’auth existante
- bonne lisibilité technique
- suffisant pour un portfolio

#### Inconvénients

- non bidirectionnel
- moins adapté à des usages temps réel avancés

#### Verdict

Retenu.

## Décision finale

**SSE est retenu comme mécanisme temps réel officiel du projet.**
Le choix est guidé par le besoin réel, la simplicité, la cohérence architecturale et la volonté d’éviter une complexité non rentable dans un projet portfolio.
