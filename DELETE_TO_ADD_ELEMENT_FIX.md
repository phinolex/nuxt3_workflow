# Fix: Retour au node "Ajouter un élément" après suppression

## Problème
Lorsqu'un node (Question, Audio, etc.) est créé depuis un node "Ajouter un élément" dans une branche de condition, la suppression de ce node ne recréait pas le node "Ajouter un élément" d'origine.

## Solution implémentée

### 1. **AddElementNode.vue** - Ajout de métadonnées
Quand un nouveau node est créé depuis "Ajouter un élément", on stocke les informations d'origine :

```javascript
data: {
  ...getDefaultDataForType(type),
  // Stocker les informations du node 'Ajouter un élément' d'origine
  createdFromAddElement: {
    nodeId: props.id,
    conditionBranch: props.data.conditionBranch,
    branchLabel: props.data.branchLabel
  }
}
```

### 2. **questionnaire-builder.vue** - Gestion de la suppression
La fonction `handleNodeDelete` vérifie maintenant si le node a été créé depuis un "Ajouter un élément" :

```javascript
// Vérifier si ce node a été créé depuis un node "Ajouter un élément"
if (node.data?.createdFromAddElement) {
  const addElementInfo = node.data.createdFromAddElement
  
  // Recréer le node "Ajouter un élément"
  const addElementId = addElementInfo.nodeId || `${nodeId}-add-element`
  addNodes({
    id: addElementId,
    type: 'add-element',
    position: node.position,
    data: {
      conditionBranch: addElementInfo.conditionBranch,
      branchLabel: addElementInfo.branchLabel,
      isGhost: true
    }
  })
  
  // Reconnecter l'edge avec animation
  // Supprimer les edges sortants et nodes "end" temporaires
}
```

## Comportement résultant

1. **Création** : Quand on clique sur "Ajouter un élément" et qu'on crée un node, les informations d'origine sont stockées
2. **Suppression** : Quand on supprime ce node, le système :
   - Détecte qu'il vient d'un "Ajouter un élément"
   - Recrée le node "Ajouter un élément" à la même position
   - Reconnecte l'edge depuis la condition avec animation
   - Supprime les nodes "end" temporaires créés automatiquement

## Avantages
- L'utilisateur peut facilement revenir en arrière
- Les branches de condition restent cohérentes
- L'animation de l'edge indique clairement qu'une action est attendue