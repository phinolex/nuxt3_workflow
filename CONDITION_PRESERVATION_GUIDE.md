# Guide : Préservation de structure lors de la configuration des conditions

## Nouveau comportement

Le système détecte maintenant automatiquement si une condition a déjà une structure construite et préserve cette structure lors de la configuration.

### Détection automatique

Le système considère qu'une structure existe si :
- Il y a des edges sortants de la condition
- Au moins un des nodes connectés n'est pas un node "Ajouter un élément"

### Mode Préservation

Quand une structure existe, le système :

1. **Préserve tous les nodes existants** - Aucun node n'est supprimé ou déplacé
2. **Maintient toutes les connexions** - Les edges existants sont mis à jour, pas recréés
3. **Met à jour uniquement les métadonnées** :
   - Labels des branches
   - Valeurs de condition
   - Type de condition
   - Labels des edges

### Gestion intelligente des branches

- **Branches existantes** : Leurs IDs sont préservés, seules les données sont mises à jour
- **Nouvelles branches** : Des nodes "Ajouter un élément" sont créés automatiquement
- **Branches supprimées** : Leurs connexions sont proprement supprimées

## Exemples d'utilisation

### Cas 1 : Première configuration
1. Créer un node condition
2. Construire toute la structure (questions, audios, etc.)
3. Configurer la condition → La structure est préservée

### Cas 2 : Ajout de branches
1. Condition existante avec 2 branches
2. Éditer pour ajouter une 3ème branche
3. Les 2 branches existantes restent intactes
4. Un nouveau node "Ajouter un élément" apparaît pour la 3ème branche

### Cas 3 : Modification des labels
1. Condition avec structure complexe
2. Changer les noms des branches
3. Toute la structure reste en place, seuls les labels changent

## Logs de debug

Dans la console, vous verrez :
- `🎯 Analyse:` - Indique si une structure existe
- `📌 MODE PRÉSERVATION` - Confirme que la structure sera préservée
- `📊 Gestion des branches:` - Détails sur les branches ajoutées/supprimées

## Retour à l'ancien comportement

Si vous voulez forcer la reconstruction complète :
1. Supprimer manuellement tous les nodes connectés
2. La condition détectera qu'il n'y a plus de structure
3. Elle utilisera l'ancien comportement de reconstruction