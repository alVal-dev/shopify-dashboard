# Spike — Server-Sent Events (NestJS + Vue 3 / EventSource)

## Date

20-02-2026

## Objectif

Valider que **Server-Sent Events (SSE)** est une solution viable pour le temps réel du dashboard :
- endpoint SSE côté NestJS
- consommation côté Vue 3 via `EventSource` 
- réception continue de messages
- comportement de déconnexion / reconnexion observé en dev

## Risque identifié

SSE repose sur une connexion HTTP longue durée. Les risques principaux :
- **Reconnexion non fiable** : connexion reste "ouverte" mais silencieuse (proxy / réseau)
- **Fuite de ressources côté serveur** : stream non arrêté quand le client ferme la connexion
- **Comportement dev ≠ prod** : proxy Vite, buffering, cold starts PaaS

## Hypothèse testée

Il est possible de streamer des événements via NestJS (`@Sse()` + RxJS) et de les consommer via `EventSource` natif pour obtenir une base suffisante pour un dashboard temps réel. Les améliorations de robustesse seront ajoutées.

## Contexte

- Backend : NestJS avec RxJS (Observable)
- Frontend : Vue 3 avec EventSource natif
- Dev local : Front sur `http://localhost:5173` avec proxy Vite `/api` → `http://localhost:3000`
- Production : déploiement mono-origin (NestJS sert le SPA)

## Version testée

- @nestjs/common : 11.1.14
- EventSource : natif navigateur (Chrome)

## Référence

- Commit spike : `chore: sse spike - go confirmed` 

## Résultat

**GO** : SSE est viable pour le temps réel du dashboard.

Décision pour l'implémentation finale (prod) :
- Heartbeat toutes les 30 secondes pour garder la connexion vivante
- Watchdog côté client (silence → recréer connexion)
- Backoff contrôlé si reconnexion échoue en boucle
- Limite de 5 connexions SSE par IP (protection démo publique)

## Tests réalisés

| Scénario | Résultat |
|---|---|
| Connexion initiale au flux SSE | ✅ OK |
| Réception des messages toutes les 2 secondes | ✅ OK |
| Mise à jour d’un état de connexion (connected/…) | ✅ OK |
| Reconnexion après coupure backend en dev (via proxy Vite) | ⚠️ Comportement inattendu |
| Flux SSE fonctionnel sur port backend direct (sans proxy) | ✅ OK |

## Findings et points d'attention

### ✅ GO confirmé pour SSE

Le flux SSE fonctionne parfaitement entre NestJS et EventSource. Le decorator `@Sse()` de NestJS est simple et fiable.

### ⚠️ Limitation du proxy Vite en développement

**Observation :** quand le backend NestJS est coupé puis redémarré, le client EventSource reste bloqué en statut `CONNECTING` mais ne se reconnecte pas réellement. La connexion SSE reste ouverte dans l'onglet Network de Chrome avec un statut 200 mais aucun nouveau message n'arrive.

**Cause identifiée :** le proxy Vite (`/api` → `localhost:3000`) n'est pas conçu pour gérer les connexions SSE longue durée et leur reconnexion. Le proxy "absorbe" la connexion et ne la relâche pas proprement après une coupure.

**Conséquence :** impossible de tester la reconnexion SSE en environnement de développement avec le proxy Vite.

**Impact sur le projet :** aucun. En production, NestJS sert le frontend et l'API sur le même port, il n'y a pas de proxy. La reconnexion sera testée en prod en conditions réelles.

### EventSource reconnecte automatiquement

EventSource tente de se reconnecter automatiquement après une coupure avec un délai par défaut de ~3 secondes. Le serveur peut surcharger ce délai via `retry: <ms>\n\n` dans le flux SSE.

## À valider en prod

- Reconnexion en production sans proxy Vite
- Comportement avec les cold starts Render (backend dort après 15 min d'inactivité)
- Robustesse du watchdog et du backoff côté client

## Nettoyage

Le code du spike (endpoint tick + page spike) est supprimé après validation afin de ne pas polluer le codebase. Seule cette documentation est conservée.