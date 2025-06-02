# Optimisations de Performance pour VueFlow dans questionnaire-builder

## Problèmes identifiés et solutions appliquées :

### 1. **Appels multiples à layoutGraph()**
- **Problème** : Plusieurs appels à `layoutGraph()` avec des `setTimeout` créaient des boucles de rendu
- **Solution** : Implémentation d'un `debounce` de 300ms pour regrouper les appels multiples

### 2. **setTimeout non gérés**
- **Problème** : Fuites mémoire potentielles avec des `setTimeout` non nettoyés
- **Solution** : 
  - Utilisation d'un `Set` pour tracker tous les timeouts
  - Cleanup dans `onUnmounted()`
  - Remplacement de certains `setTimeout` par `requestAnimationFrame`

### 3. **Watchers profonds coûteux**
- **Problème** : `watch(workflowJSON, ..., { deep: true })` surveillait tous les changements
- **Solution** : Remplacé par un watch simple sur la longueur des arrays

### 4. **Re-rendus excessifs**
- **Problème** : Utilisation de `ref` pour les grandes collections causait des re-rendus fréquents
- **Solution** : 
  - Migration vers `shallowRef` pour `nodes` et `edges`
  - Utilisation de `triggerRef` pour forcer les mises à jour quand nécessaire

### 5. **Chargement initial lourd**
- **Problème** : 9 nodes et 11 edges chargés immédiatement au montage
- **Solution** : 
  - Lazy loading des données initiales depuis un fichier séparé
  - Affichage d'un spinner pendant le chargement

### 6. **Computed workflowJSON non optimisé**
- **Problème** : Recalcul complet à chaque changement
- **Solution** : Implémentation d'un cache basé sur la taille des collections

### 7. **Optimisations supplémentaires**
- Utilisation de `requestAnimationFrame` au lieu de `setTimeout` pour les opérations de rendu
- Batch des mises à jour de nodes quand possible
- Éviter les opérations synchrones lourdes au montage

## Résultats attendus :
- Chargement initial plus rapide
- Interactions plus fluides
- Moins de re-rendus inutiles
- Meilleure gestion de la mémoire
- Performance améliorée sur les grands workflows

## Pour tester :
1. Ouvrir `/questionnaire-builder`
2. Observer le spinner de chargement initial
3. Les interactions avec les nodes devraient être plus fluides
4. Les opérations de layout sont maintenant debouncées