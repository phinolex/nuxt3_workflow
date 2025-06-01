# Fix du positionnement des edges du node condition

## Problème résolu
Les edges des chemins du node condition ne se reconnectaient pas correctement aux handles après l'ajout ou la suppression de chemins dans le questionnaire-builder.

## Solution implémentée

### Modifications dans `pages/questionnaire-builder.vue`

La fonction `handleConditionConfirm` a été refactorisée pour :

1. **Préserver les edges existants** : Création d'une map des edges par sourceHandle avant la mise à jour
2. **Attente appropriée** : Ajout d'un délai de 50ms après nextTick() pour s'assurer que Vue Flow a traité les changements DOM
3. **Suppression et recréation des edges** : 
   - Suppression temporaire de tous les edges sortants du node condition
   - Recréation avec les bons sourceHandles correspondant aux nouvelles branches
4. **Gestion intelligente des branches** :
   - Les branches existantes conservent leurs edges (avec mise à jour du label si nécessaire)
   - Les nouvelles branches créent des nodes "add-element" 
   - Les branches supprimées voient leurs edges retirés

### Points clés de l'implémentation

```typescript
// Attendre que Vue Flow traite les changements
await nextTick()
await new Promise(resolve => setTimeout(resolve, 50))

// Forcer la reconnexion en supprimant puis recréant les edges
const remainingEdges = edges.value.filter(edge => edge.source === nodeId)
if (remainingEdges.length > 0) {
    removeEdges(remainingEdges)
    await nextTick()
}

// Recréer avec les bons sourceHandles
data.branches.forEach((branch: any) => {
    const oldEdge = edgesByHandle.get(branch.id)
    if (oldEdge && remainingEdges.some(e => e.id === oldEdge.id)) {
        allEdgesToCreate.push({
            ...oldEdge,
            sourceHandle: branch.id,
            label: branch.label,
            type: 'simple-condition',
            animated: oldEdge.target.includes('ghost') || oldEdge.target.includes('add-element')
        })
    }
})
```

## Résultat
Les edges restent maintenant correctement connectés aux handles correspondants lors de l'ajout ou la suppression de chemins dans un node condition.