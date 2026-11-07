# ForoSat — NASA Space Apps 2026, Défi 6 (BEM Tech)

ForoSat aide un agriculteur ivoirien, ou son conseiller, à choisir sa prochaine rotation de cultures : la rotation actuelle est comparée à deux alternatives sur 7 critères, avec le pourquoi, les lacunes et un niveau de confiance, à partir de 20 ans de données satellites NASA. Zone pilote : Korhogo.

> Les chiffres affichés sont des **valeurs d'exemple** tirées des maquettes. Le pipeline NASA et le moteur de score réels viennent après.

## Structure

| Dossier | Contenu | Responsable |
|---|---|---|
| `frontend/` | Application Next.js (web et mobile, une seule base de code) | Interface |
| `data/pilot/korhogo/` | JSON lus par l'interface (le contrat de données) | Données, agronomie |
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

L'interface ne lit les données que par `frontend/src/lib/data`. Pour remplacer les valeurs d'exemple, produire les mêmes fichiers dans `data/pilot/korhogo/` : la validation (zod) indique exactement ce qui manque. Le détail champ par champ est dans [`docs/contrat-donnees.md`](docs/contrat-donnees.md).

- Un autre dossier de données : variable d'environnement `FOROSAT_DATA_DIR`.
- Quand l'API FastAPI existera, seule la couche `src/lib/data` change ; les écrans restent identiques.

Commandes à lancer depuis `frontend/` : l'application cherche les données dans `../data/pilot/korhogo`.

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
python3 build_climat.py       # met à jour data/pilot/korhogo/climat.json avec les vraies valeurs
python3 build_regions.py      # climat réel des 33 régions et districts (data/regions/<id>.json)
python3 -m unittest test_indicators test_climat_region
```

Aujourd'hui seuls la **pluie** et la **chaleur** sont réelles (NASA POWER), pour **les 31 régions et 2 districts** (au chef-lieu de chacun ; une ou deux saisons des pluies détectées). Les rotations restent l'exemple calculé pour Korhogo, et l'écran le dit hors de la zone pilote. Sol, végétation, eau stockée et alertes restent des valeurs d'exemple ; l'écran Climat l'indique. Prochaines sources : GPM, SMAP, MODIS/Landsat, SRTM, puis ECOSTRESS et GRACE (compte NASA Earthdata nécessaire).

## Règles d'équipe

Une branche GitHub par membre, un push par jour, et tout blocage signalé le jour même dans le groupe.
