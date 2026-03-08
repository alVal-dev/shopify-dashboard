# Spike — Gridstack + Vue 3

## Date

20-02-2026  
Mise à jour après intégration réelle phase 7

## Objectif

Valider que Gridstack convient pour le dashboard :

- drag & drop + resize
- intégration de widgets Vue 3 dans les cellules
- sérialisation/restauration du layout
- ajout / suppression de widgets dans un pattern Vue-first
- identifier les pièges d’intégration réels (DOM ownership, lifecycle, lecture d’état)

## Risque identifié

Gridstack manipule le DOM directement alors que Vue 3 gère le DOM via un virtual DOM.

Si les deux systèmes modifient les mêmes éléments, on risque :

- perte de réactivité après drag/resize
- démontage inattendu des composants
- désynchronisation DOM réel / virtual DOM
- widgets “fantômes”
- état de grille incomplet ou non fiable au moment de la persistance

## Hypothèse initiale testée

Il est possible de monter des composants Vue 3 dans des cellules Gridstack via `createApp().mount()` (approche Gridstack-first) et de conserver un comportement stable à condition de gérer explicitement le lifecycle (`unmount`).

## Contexte

- Front : Vue 3 + Vite
- Layout engine : Gridstack
- Contrainte : Gridstack manipule le DOM, Vue utilise un virtual DOM
- Version intégrée : `gridstack 12.4.2`

## Résultat final

**GO confirmé** : Gridstack est viable pour le besoin.

L’intégration réelle a validé :

- drag & drop
- resize
- rendu stable des widgets Vue existants dans `.grid-stack-item-content`
- ajout de widget depuis un catalogue latéral
- suppression de widget
- persistance backend du layout
- fonctionnement en mode démo avec persistance locale uniquement

## Résultat du spike vs décision finale projet

La conclusion initiale du spike était une approche **Gridstack-first**.

Cette conclusion a été abandonnée au profit de **Vue-first + `makeWidget()`**.

L’intégration réelle a confirmé que cette décision était la bonne :

- Vue rend les `.grid-stack-item`
- Gridstack transforme les éléments rendus via `makeWidget()`
- les widgets métier restent des composants Vue normaux
- `DashboardGrid.vue` reste un adaptateur d’intégration
- `useDashboardGrid` reste un wrapper technique pur

## Tests réalisés et enseignements réels

### 1) Drag & drop / resize des widgets Vue existants

- les 4 widgets métier existants fonctionnent dans la grille
- les interactions PrimeVue et les tooltips ECharts restent utilisables
- le drag passe par une poignée dédiée dans `WidgetWrapper.vue`

### 2) Ajout et suppression en pattern Vue-first

L’ajout et la suppression dynamiques ne sont pas automatiques avec Gridstack en Vue-first.

Constat réel :

- si Vue rend un nouveau `.grid-stack-item` après `init()`, Gridstack ne l’enregistre pas tout seul
- si Vue retire un item, Gridstack peut conserver un nœud interne si on ne synchronise pas explicitement

Solution retenue :

- ajout d’une méthode technique `syncRenderedItems()` dans `useDashboardGrid`
- `DashboardGrid.vue` observe les ids des widgets rendus
- après changement de la liste, Vue rend d’abord le DOM, puis Gridstack synchronise ses widgets enregistrés
- la synchronisation gère à la fois les nouveaux items et les suppressions

### 3) Persistance du layout

Le bon event pour la persistance du layout est `change`.

Faits confirmés :

- `change` se déclenche une fois à la fin d’un drag/resize
- `change` remonte les widgets impactés
- `resizestop` n’est pas adapté à la persistance complète, car il ne remonte qu’un widget
- `change` reste donc le bon signal pour déclencher l’autosave du layout

### 4) Limite importante de `grid.save(false)`

Point clé découvert pendant l’intégration réelle :

`grid.save(false)` peut renvoyer des widgets **partiels** en `12.4.2`, notamment après certains resize.

Exemple observé :

- présence de `id`, `x`, `y`
- absence de `w` et/ou `h`

Conséquence :

- la lecture stricte de `save(false)` peut produire un état incomplet
- cela casse le mapping métier et la persistance

Décision retenue :

- `save(false)` n’est **pas** utilisé comme source canonique de `currentItems`
- `currentItems` est relu depuis les `.grid-stack-item` réellement rendus
- lecture via `gridstackNode` en priorité
- fallback technique sur les attributs DOM `gs-*` si nécessaire

## Pourquoi la décision a changé

La difficulté réelle n’était pas “faire marcher Gridstack”, mais stabiliser proprement les frontières entre :

- Vue
- Gridstack
- domaine dashboard
- persistance du layout

L’intégration réelle a montré que la complexité utile ne se trouvait pas dans le rendu des widgets Vue eux-mêmes, mais dans :

- le contrat du composable
- la synchronisation après ajout / suppression
- la définition de la vraie source de vérité de l’état courant de grille

## Points d’attention / pièges identifiés

### DOM ownership

Une seule stratégie doit être utilisée.

Ne pas mélanger :

- Vue-first avec rendu par `v-for`
- et Gridstack-first avec `removeAll()/addWidget()` comme moteur principal

La stratégie retenue et validée est : **Vue-first + `makeWidget()`**.

### Lifecycle

L’initialisation Gridstack doit se faire après rendu réel du DOM.

Pour les changements de liste :

- Vue rend d’abord
- Gridstack se synchronise ensuite via `syncRenderedItems()`

### Source canonique de l’état courant

`grid.save(false)` n’est pas suffisamment fiable comme source canonique dans ce projet.

La source retenue est :

- DOM rendu
- `gridstackNode`
- fallback DOM `gs-*`

### Contraintes de taille minimale

Pour éviter des états de resize inutilisables :

- des `minW` / `minH` sont définis par type de widget
- ces minima sont des contraintes frontend
- ils ne font pas partie du layout persisté
- ils ne sont pas stockés côté backend

### Persistance et mode démo

Le store dashboard applique toujours le layout localement.

La persistance backend est :

- activée hors démo
- désactivée en démo

Le refresh en démo recharge donc le layout backend initial, ce qui est attendu.

## Difficultés réellement rencontrées

Les sujets réellement délicats ont été :

- le contrat exact de `useDashboardGrid`
- la synchronisation Gridstack après ajout / suppression d’items Vue
- la non-fiabilité pratique de `save(false)` comme source complète d’état
- la séparation entre mise à jour locale, mapping métier et persistance backend

## Décisions verrouillées pour l’implémentation

Le composable `useDashboardGrid` est un **wrapper technique pur**.

Contrat retenu :

- `init()`
- `destroy()`
- `syncRenderedItems()`
- `isReady`
- `currentItems`
- `onChange(...)`
- `onResizeStop(...)`

Sémantique :

- `change` expose les widgets impactés au format `{ id, x, y, w, h }[]`
- `resizestop` expose le widget redimensionné au même format
- `currentItems` représente l’état complet courant de la grille
- `currentItems` est mis à jour :
  - après `init()`
  - après `syncRenderedItems()`
  - sur les vrais `change` utilisateur
- `resizestop` ne met pas à jour `currentItems`

Politique de lecture :

- `currentItems` est relu depuis le DOM / `gridstackNode`
- fallback technique sur attributs DOM `gs-*` si nécessaire
- aucune valeur inventée
- si l’état reste invalide : warning + pas d’émission exploitable

Politique d’exposition :

- `currentItems` est exposé en lecture
- les callbacks reçoivent des copies clonées
- pas de logique métier dashboard dans le composable
- pas d’exposition de l’instance Gridstack

Politique métier retenue autour du layout :

- helper métier séparé : `apps/web/src/utils/layout-mapper.ts`
- mapper strict : mismatch de longueur ou d’ids = erreur
- store dashboard = source de vérité locale du layout
- persistance backend pilotée depuis le store
- mode démo = local only

## Conclusion

Gridstack répond au besoin et l’intégration retenue pour le projet est **Vue-first + `makeWidget()`**.

Le principal apprentissage de l’intégration réelle est le suivant :

**la difficulté n’était pas le drag & drop lui-même, mais la définition d’une frontière fiable entre rendu Vue, enregistrement Gridstack, lecture d’état courant et persistance métier.**
