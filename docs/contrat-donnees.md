# Contrat de données ForoSat

Les écrans lisent `data/regions/<id>.json`, `data/pilot/korhogo/*.json` et `knowledge/cultures.json`, validés par les schémas zod de `frontend/src/lib/contract/index.ts`. Pour brancher des données réelles, produire les mêmes fichiers (ou la même réponse d'API) : la validation dit exactement ce qui manque.

| Fichier | Contenu | Producteur |
|---|---|---|
| `data/regions/<id>.json` | Climat réel d'une région (NASA POWER) : 4 indicateurs, pluie mensuelle (mm), saisons des pluies, matrice (pluie, chaleur, humidité du sol ; niveaux 0 à 4), alertes, `onglets` (pluie, chaleur, sol), `actuel` (30 derniers jours) et `meta` (sources, période, tendance). onglet `veg` et ligne « Végétation » : NDVI MODIS via NASA GIBS ; `grace` : eau stockée GRACE / GRACE-FO via NASA GIBS (moyenne annuelle en cm, `null` = lacune) | Pipeline (membre 1) |
| `knowledge/cultures.json` | 8 fiches cultures : famille, cycle, besoin en eau, légumineuse, notes 1 à 5 (sécheresse, chaleur, couverture, fourrage, travail du sol, revenu, marché), sources ; revenu et marché sont des hypothèses | Agronomie (membre 2) |
| `couches.json` | Couches satellite de la carte, servies en tuiles par NASA GIBS sans clé : nom de couche GIBS, format, zoom natif, jour de l'année affiché, première année disponible, opacité | Membre 1 |
| `sources.json` | 5 étapes de méthode, 8 sources NASA, 4 approches IA comparées, liste « là où l'humain décide » | Membre 5 (contenu) |
| `lexique.json` | 14 termes : définition simple et pourquoi c'est utile | Membre 5 |

## Régions
`frontend/src/lib/regions.json` liste les 31 régions et 2 districts autonomes (chef-lieu géocodé sur OpenStreetMap). `data/regions/<id>.json` donne le climat de chacune, au même format que `climat.json`, avec `saisons` (une ou deux saisons des pluies) et `meta.region`. L'interface les sert en JSON statique sur `/api/climat/<id>`.

## Provenance
Chaque climat porte `meta` : `reel` (grandeurs mesurées), `source`, `periode`, `tendancePluie`, `region`. L'écran Climat les cite. Les rotations ne sont plus un fichier : le moteur (`frontend/src/lib/moteur/`) les calcule pour chaque parcelle.

## Règles
- Critères de score (1 à 5) : `fertilite`, `eau`, `secheresse`, `revenu`, `erosion`, `fourrage`, `marche`.
- Une valeur manquante dans une série est `null` et s'affiche comme lacune, jamais comme zéro.
- Calendrier : chaque entrée a une année (1 à 3), un type (`culture`, `couverture`, `sol_nu`) et des mois de 1 à 12 (inclus).
- Les fiches cultures portent `aValider: true` : leurs valeurs viennent de sources publiques et doivent être confirmées par l'agronome.
