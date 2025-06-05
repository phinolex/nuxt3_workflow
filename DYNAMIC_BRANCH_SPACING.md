# Espacement dynamique des branches de condition

## Fonctionnalité

Le système ajuste automatiquement l'espacement entre les branches d'une condition pour éviter tout chevauchement, peu importe la complexité des sous-structures.

## Comment ça fonctionne

### 1. Calcul de largeur
Pour chaque branche, le système :
- Explore récursivement tous les nodes enfants
- Calcule la largeur totale occupée (du node le plus à gauche au plus à droite)
- Prend en compte toutes les sous-conditions et leurs branches

### 2. Détection de chevauchement
Le système vérifie :
- Si deux branches adjacentes se chevauchent
- Si l'espace entre elles est insuffisant (minimum 50px)

### 3. Repositionnement intelligent
Si un chevauchement est détecté :
- Calcule l'espace total nécessaire
- Redistribue les branches uniformément
- Déplace toute la sous-structure de chaque branche

## Exemple concret

```
Condition principale
    ├── Branche gauche
    │   └── Sous-condition (6 branches)
    │       ├── Branch 1
    │       ├── Branch 2
    │       ├── Branch 3
    │       ├── Branch 4
    │       ├── Branch 5
    │       └── Branch 6
    └── Branche droite
        └── Sous-condition (2 branches)
            ├── Branch A
            └── Branch B
```

**Résultat** : La branche gauche et droite s'écartent automatiquement pour accommoder les 6 sous-branches à gauche.

## Paramètres

- **Espacement minimum** : 50px entre les branches
- **Déclenchement** : Après chaque modification du graphe
- **Délai** : 300ms (debounced) pour éviter les calculs excessifs

## Logs de debug

Dans la console :
- `🔧 Ajustement de l'espacement` - Début de l'analyse
- `📐 Analyse condition` - Détails sur chaque condition
- `📊 Branches analysées` - Largeurs calculées
- `⚠️ Chevauchement détecté` - Quand un ajustement est nécessaire
- `📍 Déplacement` - Nouvelles positions appliquées

## Limitations

- Fonctionne uniquement horizontalement (axe X)
- L'espacement vertical reste géré par le layout principal
- Performance peut être impactée avec de très grandes structures (100+ nodes)