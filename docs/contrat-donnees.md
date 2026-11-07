# Contrat de données ForoSat

Les écrans lisent uniquement `data/pilot/korhogo/*.json`, validés par les schémas zod de `frontend/src/lib/contract/index.ts`. Pour brancher des données réelles, produire les mêmes fichiers (ou la même réponse d'API) : la validation dit exactement ce qui manque.

| Fichier | Contenu | Producteur |
|---|---|---|
| `climat.json` | 4 indicateurs, pluie mensuelle (12 valeurs en mm), saison des pluies (mois de début et de fin), matrice annuelle (6 lignes × 12 mois, niveaux 0 à 4), série GRACE (21 années 2005–2025, `ecart: null` = **lacune**), 3 alertes, `onglets` (4 indicateurs de 12 valeurs pour l'affichage téléphone : pluie, chaleur, sol, végétation) et `actuel` (état du moment pour le tableau de bord : saison, tuiles, extras) | Membre 1 (données) |
| `rotations.json` | 3 rotations A, B, C : séquence, 7 scores de 1 à 5, note, pourquoi, données citées, risques, **lacune**, **confiance** (niveau et 4 facteurs de 1 à 5), calendrier sur 3 ans | Membres 2 et 3 (agronomie, moteur) |
| `couches.json` | 4 couches de la carte : source, échelle, palette de 8 couleurs | Membre 1 |
| `sources.json` | 5 étapes de méthode, 8 sources NASA, 4 approches IA comparées, liste « là où l'humain décide » | Membre 5 (contenu) |
| `lexique.json` | 14 termes : définition simple et pourquoi c'est utile | Membre 5 |

## Règles
- Critères de score (1 à 5) : `fertilite`, `eau`, `secheresse`, `revenu`, `erosion`, `fourrage`, `marche`.
- Une valeur manquante dans une série est `null` et s'affiche comme lacune, jamais comme zéro.
- Calendrier : chaque entrée a une année (1 à 3), un type (`culture`, `couverture`, `sol_nu`) et des mois de 1 à 12 (inclus).
- Les valeurs actuelles sont des **valeurs d'exemple** tirées des maquettes ; les rotations A et C reprennent la structure de B avec des textes provisoires à valider par l'agronomie.
