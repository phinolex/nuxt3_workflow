# Fix des handles dynamiques du node condition

## Problème résolu
Les edges ne se reconnectaient pas correctement aux handles du node condition lors de l'ajout ou la suppression de chemins.

## Solution implémentée

### Utilisation de `updateNodeInternals`
D'après la documentation Vue Flow, lors de la modification dynamique des handles d'un node, il est nécessaire d'appeler `updateNodeInternals` pour forcer Vue Flow à recalculer les positions des handles.

### Modifications dans `handleConditionConfirm`

1. **Import de `updateNodeInternals`** depuis `useVueFlow`

2. **Nouvelle séquence d'opérations** :
   - Suppression des edges AVANT la mise à jour du node
   - Mise à jour des données du node
   - Appel de `updateNodeInternals([nodeId])` après la mise à jour
   - Attente suffisante pour que Vue Flow traite les changements
   - Création des nouveaux edges avec les bons `sourceHandle`
   - Nouvel appel de `updateNodeInternals` après l'ajout des edges

### Points clés

```typescript
// Forcer la mise à jour des handles après modification du node
updateNodeInternals([nodeId])

// Attendre que Vue Flow traite les changements
await nextTick()
await new Promise(resolve => setTimeout(resolve, 150))

// Forcer une nouvelle mise à jour après l'ajout des edges
updateNodeInternals([nodeId])
```

### Amélioration de la gestion des IDs
Les IDs des edges incluent maintenant la target pour éviter les conflits :
```typescript
id: `e-${nodeId}-${branch.id}-${existingConnection.target}`
```

## Résultat
Les edges se reconnectent maintenant correctement aux nouveaux handles lors de l'ajout ou la suppression de chemins dans un node condition, conformément à la documentation Vue Flow sur les handles dynamiques.