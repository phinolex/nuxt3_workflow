# Préservation de l'ordre des branches de condition

## Problème résolu

Les branches d'une condition pouvaient être inversées (gauche ↔ droite) lors de l'ajout de nouveaux nodes ou lors du recalcul du layout.

## Solution implémentée

### 1. Sauvegarde de l'ordre original
Avant chaque recalcul du layout, le système :
- Identifie toutes les conditions
- Sauvegarde l'ordre des branches (de gauche à droite)
- Mémorise quelle branche est à quelle position

### 2. Restauration après layout
Après le recalcul du layout :
- Vérifie si l'ordre a été modifié
- Si oui, réorganise les branches pour respecter l'ordre original
- Déplace automatiquement tous les nodes enfants avec leur branche

### 3. Déplacement intelligent
Quand une branche est déplacée :
- Tous ses nodes enfants sont déplacés avec elle
- La structure complète de la branche est préservée
- Seule la position X change, pas la structure verticale

## Comportement attendu

### Exemple :
1. Condition avec 2 branches : Gauche (Audio 1) et Droite (Audio 2)
2. Ajout d'une sous-condition complexe à gauche
3. Le layout recalcule les positions
4. **Résultat** : La branche gauche reste à gauche, même si elle est devenue plus large

## Logs de debug

Dans la console :
- `📌 Ordre des branches sauvegardé` - Montre l'ordre original
- `⚠️ Ordre des branches modifié` - Détecte un changement d'ordre
- `📍 [nodeId]: X oldX → newX` - Montre les corrections de position

## Limitations

- Fonctionne uniquement pour les nodes de type "condition"
- L'ordre est basé sur la position X initiale
- Si deux branches ont exactement la même position X, l'ordre peut être ambigu