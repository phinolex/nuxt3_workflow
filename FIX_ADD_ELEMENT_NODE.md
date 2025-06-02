# Correction du système d'ajout automatique de node "End"

## Problème identifié
Lorsqu'on ajoute un nouveau node (Question ou Audio) via le bouton "+" sur un edge, si le node cible est un node "End" temporaire (qui a été automatiquement créé), il ne se comporte pas comme le node "Ajouter un élément".

## Solutions implémentées

### 1. **QuestionnaireAddNodeEdge.vue** - Détection et gestion des nodes "End" temporaires

#### Dans `handleAddQuestion()` et `handleAddAudio()`:
```javascript
// Vérifier si le node cible est un node "end" temporaire qui doit être supprimé
const shouldRemoveTargetEnd = targetNode.type === 'end' && 
  edges.filter(e => e.source === props.target).length === 0 && // pas de connexions sortantes
  edges.filter(e => e.target === props.target).length === 1 // seulement notre connexion entrante

if (shouldRemoveTargetEnd) {
  // Supprimer le node end temporaire
  setTimeout(() => {
    removeNodes([props.target])
  }, 50)
  
  // Créer un nouveau node end après le nouveau node
  const endNodeId = `end-${Date.now()}`
  const endNode = {
    id: endNodeId,
    type: 'end',
    position: {
      x: newNode.position.x,
      y: newNode.position.y + 150
    },
    data: {
      step: (newStep + 1).toString(),
      name: 'Fin',
      label: 'Questionnaire terminé'
    }
  }
  
  addNodes([endNode])
  
  const newEdge2 = {
    id: `e-${newNodeId}-${endNodeId}`,
    source: newNodeId,
    target: endNodeId,
    type: 'add-node'
  }
  
  addEdges([newEdge1, newEdge2])
}
```

### 2. **handleAddCondition()** - Gestion similaire pour les conditions
La même logique a été appliquée lors de l'ajout d'un node condition pour gérer correctement les nodes "End" temporaires.

## Comportement attendu

1. **Ajout sur un edge normal** : Le nouveau node est inséré entre la source et la cible
2. **Ajout sur un edge vers un node "End" temporaire** :
   - Le node "End" temporaire est supprimé
   - Le nouveau node est ajouté
   - Un nouveau node "End" est créé après le nouveau node
   - L'edge est de type "add-node" pour avoir le bouton "+"

## Comment tester

1. Créer un workflow simple avec un node qui se termine par un node "End"
2. Cliquer sur le bouton "+" de l'edge qui mène au node "End"
3. Ajouter une "Question" ou un "Audio"
4. Vérifier que :
   - L'ancien node "End" est supprimé
   - Le nouveau node est correctement ajouté
   - Un nouveau node "End" est créé après le nouveau node
   - Le nouvel edge a un bouton "+"

## Notes techniques

- Utilisation de `setTimeout` pour permettre aux opérations asynchrones de se terminer
- Vérification du nombre de connexions entrantes/sortantes pour identifier les nodes "End" temporaires
- Conservation du type d'edge "add-node" pour maintenir la fonctionnalité du bouton "+"