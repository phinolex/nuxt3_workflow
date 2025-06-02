# Fix: Reconnexion correcte de l'edge lors du retour au node "Ajouter un élément"

## Problème
Après suppression d'un node créé depuis "Ajouter un élément", le node "Ajouter un élément" était recréé mais n'était pas correctement reconnecté au workflow (il apparaissait isolé).

## Cause
L'edge existant n'avait pas nécessairement le bon `sourceHandle` pour se reconnecter à la branche de condition correcte.

## Solution implémentée

### Modification dans `handleNodeDelete` (questionnaire-builder.vue)

```javascript
// Reconnecter l'edge depuis la condition
if (incomingEdge) {
  removeEdges([incomingEdge])
  
  // Trouver le node source (qui devrait être une condition)
  const sourceNode = findNode(incomingEdge.source)
  if (sourceNode && sourceNode.type === 'condition' && addElementInfo.conditionBranch) {
    // Créer un nouvel edge avec le bon sourceHandle
    addEdges({
      id: `e-${incomingEdge.source}-${addElementInfo.conditionBranch}-${addElementId}`,
      source: incomingEdge.source,
      sourceHandle: addElementInfo.conditionBranch,  // Utiliser le bon handle
      target: addElementId,
      type: 'simple-condition',
      label: addElementInfo.branchLabel,
      animated: true
    })
  } else {
    // Fallback: utiliser l'edge existant
    addEdges({
      ...incomingEdge,
      id: incomingEdge.id,
      target: addElementId,
      type: incomingEdge.type || 'simple-condition',
      animated: true
    })
  }
}
```

## Améliorations apportées

1. **Identification du sourceHandle correct** : Utilisation de `addElementInfo.conditionBranch` pour reconnecter au bon handle de la condition
2. **Création d'un nouvel edge** : Au lieu de réutiliser l'edge existant, création d'un nouvel edge avec les bonnes propriétés
3. **Conservation du label** : Le label de la branche est restauré depuis `addElementInfo.branchLabel`
4. **Suppression des nodes "end" temporaires** : Amélioration de la logique pour supprimer tous les nodes "end" créés automatiquement

## Résultat
Le node "Ajouter un élément" est maintenant correctement reconnecté à la branche de condition d'origine avec :
- Le bon sourceHandle
- Le bon label
- L'animation activée
- La position correcte