# ForoSat — Socle et interface (chantier 1)

Date : 2026-11-07 · Rendu hackathon : 14 novembre 2026

## 1. Objectif

Mettre en place le socle du dépôt et l'interface web/mobile de ForoSat à partir des maquettes (« ForoSat – Maquettes ») et du cadrage (« ForoSat — Cadrage de la solution, Défi 6 »).

ForoSat aide un agriculteur ivoirien, ou son conseiller, à comparer sa rotation actuelle à deux alternatives sur 7 critères, avec le pourquoi, les lacunes et un niveau de confiance, à partir de 20 ans de données NASA. Zone pilote : Korhogo.

**Critère de réussite :** un utilisateur parcourt sans erreur Parcelle → Climat → Rotations → Détail → Fiche, sur ordinateur et sur téléphone, avec les données d'exemple de la zone pilote, et le contrat de données est assez clair pour que les équipes données, agronomie et IA y branchent leur travail.

## 2. Périmètre

**Dans ce chantier**
- Structure du dépôt (`frontend/`, `backend/`, `data/`, `knowledge/`, `docs/`).
- Application Next.js : accueil, 3 étapes, détail de rotation, méthode, lexique, espace conseiller (maquette), fiche partageable imprimable.
- Contrat de données (schémas) et jeux d'exemple pour Korhogo, repris des maquettes.
- Tests : validation du contrat, fonctions d'affichage, parcours de bout en bout.

**Hors de ce chantier**
- Pipeline NASA réel, API FastAPI, forêt aléatoire.
- Génération de PDF côté serveur (la fiche est une page avec mise en page d'impression).
- Langues locales, vocal, hors-ligne, retour du terrain, mode conseiller fonctionnel.
- Tuiles de carte réelles : la carte à couches utilise d'abord une mosaïque simulée, comme la maquette.

## 3. Architecture

```
frontend/    Next.js (App Router), TypeScript, Tailwind, Leaflet
backend/     README du contrat attendu (FastAPI viendra après)
data/pilot/korhogo/   JSON pré-calculés (contrat)
knowledge/   README : fiches cultures attendues (membre agronomie)
docs/        specs, plans, notes de contrat
```

Une seule base de code responsive couvre web et mobile.

### Accès aux données
L'interface lit les données uniquement via `frontend/src/lib/data`. Aujourd'hui cette couche charge `data/pilot/korhogo/*.json` ; plus tard elle appellera FastAPI (variable `NEXT_PUBLIC_API_URL`). Aucun écran ne lit un fichier directement.

### Routes
| Route | Écran |
|---|---|
| `/` | Accueil |
| `/parcelle` | Étape 1 : carte à couches, cultures, eau, priorités, matériel |
| `/climat` | Étape 2 : profil climatique |
| `/rotations` | Étape 3 : comparaison des 3 rotations |
| `/rotations/[id]` | Détail d'une rotation |
| `/methode` | Sources, grille commune, approches IA, confiance |
| `/lexique` | Termes en une phrase, avec recherche |
| `/conseiller` | Espace conseiller (vision, maquette) |
| `/fiche/[id]` | Fiche partageable, mise en page d'impression |

### État
Les choix de la parcelle (région, surface, cultures, accès à l'eau, priorités, matériel) sont gardés dans un contexte client, sauvegardé en local, partagé entre les étapes 1 à 3.

### Style
Les jetons de la maquette deviennent le thème Tailwind : noir `#07120D`, fond `#F4F6F1`, orange `#F77F00`, vert `#009E60` / `#00703C`, polices Unbounded (titres), Inter Tight (texte), Instrument Serif italique (accents). Interface en français. Éléments interactifs en vrais `button`/`a`/`input` avec libellés, cibles d'au moins 44 px.

## 4. Contrat de données

Schémas zod, types TypeScript déduits, dans `frontend/src/lib/contract`. Fichiers dans `data/pilot/korhogo/` :

- `climat.json` : pluie mensuelle, matrice annuelle (pluie, chaleur, humidité du sol, végétation, stress de chaleur, pluies extrêmes), série GRACE avec lacunes explicites (2017–2018), indicateurs clés, alertes.
- `rotations.json` : pour chaque rotation (id, étiquette, séquence de cultures, 7 scores de 1 à 5, note, pourquoi, lacune, confiance et ses 4 facteurs, calendrier sur 3 ans, sources).
- `couches.json` : les 4 couches de la carte (source, échelle, palette).
- `sources.json` : les 8 sources NASA (mesure, finesse, usage, priorité) et les 4 approches IA comparées.
- `lexique.json` : les termes et leur définition.

Règle : les lacunes et le niveau de confiance sont des champs du contrat, jamais décidés à l'affichage. Les valeurs reprises des maquettes sont marquées « valeurs d'exemple » dans l'interface.

## 5. Gestion des erreurs
- Fichier de données absent ou invalide : message clair en français, avec action de reprise (recharger, revenir à l'étape précédente) ; l'erreur de validation détaillée va dans la console.
- Parcours sans parcelle saisie : `/climat` et `/rotations` proposent de revenir à l'étape 1.
- Données manquantes (lacune) : toujours affichées comme lacune, jamais masquées.

## 6. Tests
- Vitest : validation de chaque JSON contre son schéma ; fonctions d'affichage (libellés de score, segments, conversion de hauteurs).
- Playwright : parcours Parcelle → Climat → Rotations → Détail → Fiche, en largeur ordinateur et téléphone.

## 7. Git
Branche de travail `claude/lucid-meitner-nofjvo`. Commits au nom de l'utilisateur, sans mention de Claude. Aucun push sans instruction de l'utilisateur.
