# Guide pour corriger les conditions

## Problème identifié

Les conditions ne fonctionnent pas car les branches n'ont pas les bonnes valeurs configurées.

### Symptômes :
- Les branches ont des labels génériques : "Option 1", "Option 2"
- La propriété `values` n'est pas définie pour les conditions multiples
- Les réponses ne correspondent pas aux branches

## Solution

### Pour une condition sur des checkboxes (type "multiple") :

1. Ouvrir le questionnaire dans le builder
2. Double-cliquer sur le node condition
3. Dans le modal de configuration :
   - Sélectionner le type "Plusieurs valeurs (checkbox)"
   - Pour chaque branche :
     - Donner un nom descriptif (ex: "Jalousie")
     - Dans la section "Si la réponse contient", cocher les valeurs correspondantes
     - Pour "Jalousie", cocher "Jalousie"
     - Pour "Peur", cocher "Peur"

### Structure attendue d'une branche :

```json
{
  "id": "condition-xyz-jalousie",
  "label": "Jalousie",
  "values": ["Jalousie"],  // IMPORTANT : doit contenir les valeurs à matcher
  "multipleMode": "specific"
}
```

## Vérification

Dans la console de questionnaire-preview, vérifier que :
1. Les branches ont bien une propriété `values` définie
2. Les valeurs dans `values` correspondent aux options de la question

## Correction temporaire

Si vous ne pouvez pas reconfigurer les conditions, la logique de fallback essaiera de matcher par position :
- Si "Jalousie" est la première option → première branche
- Si "Peur" est la deuxième option → deuxième branche

Mais il est recommandé de configurer correctement les conditions pour un fonctionnement fiable.