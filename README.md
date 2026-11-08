# ForoSat — NASA Space Apps 2026, Défi 6 (BEM Tech)

ForoSat aide un agriculteur ivoirien, ou son conseiller, à choisir sa prochaine rotation de cultures : la rotation actuelle est comparée à deux alternatives sur 7 critères, avec le pourquoi, les lacunes et un niveau de confiance, à partir de 20 ans de données satellites NASA. Zone pilote : Korhogo.

> Aucune donnée de démonstration : le climat vient de NASA POWER pour les 33 régions, les rotations sont calculées par un moteur de règles à partir des fiches cultures (`knowledge/cultures.json`, valeurs sourcées à valider par l'agronome).

## Structure

| Dossier | Contenu | Responsable |
|---|---|---|
| `frontend/` | Application Next.js (web et mobile, une seule base de code) | Interface |
| `data/regions/` | Climat réel de chaque région (généré par le pipeline) | Données |
| `data/pilot/korhogo/` | Couches de carte, sources et lexique | Données, contenu |
| `knowledge/cultures.json` | Fiches des 8 cultures utilisées par le moteur | Agronomie |
| `frontend/src/lib/moteur/` | Moteur de score des rotations (règles écrites, testées) | Modèle |
| `backend/` | Futur moteur FastAPI (README du contrat attendu) | Modèle et IA |
| `knowledge/` | Fiches cultures (README de ce qui est attendu) | Agronomie |
| `docs/` | Cadrage, spec, plan, `contrat-donnees.md` | Tous |

## Lancer l'interface

```bash
cd frontend
npm ci
npm run dev
```

Puis ouvrir http://localhost:3000. Le parcours : `/parcelle` → `/climat` → `/rotations` → `/rotations/B` → `/fiche/B`.

## Tests

```bash
cd frontend
npm test
npx playwright test --trace off
```

`npm test` lance les tests unitaires (Vitest). Playwright construit l'application et rejoue le parcours complet sur ordinateur et téléphone.

## Brancher les vraies données

L'interface ne lit les données que par `frontend/src/lib/data`. Pour ajouter une source, produire les mêmes fichiers : la validation (zod) indique exactement ce qui manque. Le détail champ par champ est dans [`docs/contrat-donnees.md`](docs/contrat-donnees.md).

- Un autre dossier de données : variable d'environnement `FOROSAT_DATA_DIR`.
- Quand l'API FastAPI existera, seule la couche `src/lib/data` change ; les écrans restent identiques.

Commandes à lancer depuis `frontend/` : l'application cherche les données dans `../data` et `../knowledge`.

## Carte

Leaflet, sans clé d'API :
- fond **satellite détaillé** (Esri World Imagery, pour voir les champs) ou **plan** (OpenStreetMap) ;
- couches NASA GIBS au choix de l'année : végétation (NDVI MODIS), chaleur du sol (MODIS), humidité du sol (SMAP, depuis 2015) ;
- recherche de lieu (Nominatim, plusieurs résultats au choix), « Ma position » ;
- dessin de la parcelle : zoom automatique, surface en direct, fermeture en touchant le premier point, dernier point retirable, coins déplaçables ensuite ; la région est détectée d'après la parcelle.

Les images Esri sont soumises aux conditions d'utilisation d'Esri (attribution affichée sur la carte).

## Assistant IA

L'assistant reformule une rotation en langage simple et répond aux questions, à partir des seules données ForoSat ; le score reste calculé par les règles. Il appelle un fournisseur compatible OpenAI côté serveur (`/api/ia`), la clé ne part jamais dans le navigateur. Réglages dans `frontend/.env.example` : `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` (OpenRouter et un modèle gratuit par défaut). En production, les ajouter dans Vercel, Settings > Environment Variables.

## Pipeline de données NASA

Dans `data/pipeline/` (Python 3, sans dépendance à installer) :

```bash
cd data/pipeline
python3 fetch_power.py        # télécharge NASA POWER (pluie, chaleur) de Korhogo vers data/raw/
python3 build_regions.py      # climat réel des 33 régions et districts (data/regions/<id>.json), à relancer pour rafraîchir l'état du moment
python3 -m unittest test_indicators test_climat_complet
```

Pour **les 31 régions et 2 districts** (au chef-lieu de chacun) : pluie, chaleur et humidité du sol mensuelles 2005–2025 (NASA POWER), une ou deux saisons des pluies, alertes par règles et état du moment sur les 30 derniers jours publiés. La végétation (NDVI MODIS) et l'eau stockée (GRACE) s'ajouteront avec un compte NASA Earthdata ; d'ici là, ces blocs ne s'affichent pas.

## Règles d'équipe

Une branche GitHub par membre, un push par jour, et tout blocage signalé le jour même dans le groupe.
