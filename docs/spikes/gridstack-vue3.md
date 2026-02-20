# Spike — Gridstack + Vue 3

## Date
20-02-2026

## Objectif
Valider que Gridstack convient pour le dashboard :
- drag & drop + resize
- intégration de widgets Vue 3 dans les cellules
- sérialisation/restauration du layout (IDs stables)
- identifier les pièges d’intégration (DOM ownership, lifecycle)

## Risque identifié
Gridstack manipule le DOM directement (déplacement, redimensionnement, création/suppression d'éléments) alors que Vue 3 gère le DOM via un virtual DOM.
Si les deux systèmes modifient les mêmes éléments, on risque :
- perte de réactivité après un drag/resize
- démontage inattendu des composants
- désynchronisation DOM réel / virtual DOM
- widgets “fantômes” (listeners/instances non nettoyés)

## Hypothèse testée
Il est possible de monter des composants Vue 3 dans des cellules Gridstack via `createApp().mount()` (approche Gridstack-first) et de conserver un comportement stable (drag/resize + interactions) à condition de gérer explicitement le lifecycle (unmount).

## Contexte
- Front : Vue 3 + Vite
- Layout engine : Gridstack
- Contrainte : Gridstack manipule le DOM, Vue utilise un virtual DOM

## Version testée
- gridstack : 12.4.2

## Référence
- Commit spike : `chore: gridstack vue3 spike - go confirmed`

## Résultat
**GO** : Gridstack est viable pour le besoin.

Décision pour l’implémentation finale du dashboard : **Gridstack-first**.
- Gridstack est propriétaire de la structure des widgets (création/suppression/reconstruction).
- Vue est monté dans `.grid-stack-item-content` (un widget = un composant Vue monté dans le DOM d’un item Gridstack).

## Tests réalisés (résumé)

### 1) Drag & drop / resize
- 3 widgets affichés
- déplacement + redimensionnement fluides

### 2) Widgets Vue “réels” dans les cellules
- montage de composants Vue dans les cellules Gridstack
- vérification du rendu + interactions
- nettoyage (unmount) lors de la suppression/reconstruction

### 3) Save / Restore
- extraction du layout via `grid.save(false)` → `{id,x,y,w,h}[]`
- sérialisation JSON
- restauration via :
  - unmount des widgets
  - `grid.removeAll(false)`
  - `grid.addWidget(...)` pour chaque node
  - remontage des composants Vue dans les nouveaux items

## Points d’attention / pièges identifiés

### DOM ownership : ne pas mélanger deux sources de vérité
Mélanger :
- Vue-first (Vue rend les `.grid-stack-item` via `v-for`)
- et Gridstack-first (Gridstack fait `removeAll/addWidget`)
peut créer des incohérences DOM/Vue (re-render inattendu, duplication, widgets “fantômes”).

=> Pour le dashboard final : **Gridstack-first uniquement**.

### Lifecycle
- Toujours `unmount()` les mini-apps Vue avant de supprimer/recréer les items Gridstack.

### Partage de contexte Vue (Pinia/Router)
`createApp()` par widget crée une app isolée.
À traiter lors de l’intégration du dashboard :
- injecter Pinia dans chaque mini-app, ou
- utiliser une approche avec `appContext` partagé (selon besoin réel).

## Conclusion
Gridstack répond au besoin et l’approche retenue pour la suite est **Gridstack-first**.