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

## App mobile (Expo)

`mobile/` : app Expo (SDK 58, Expo Router) avec un écran d'entrée natif (rôle, langue), 4 onglets (Accueil, Climat, Rotations, Champ) qui affichent les pages du site en mode app (`?app=1`), le GPS et le partage natifs, et un écran « Pas de connexion ».

```bash
cd mobile
npm ci
EXPO_PUBLIC_WEB_URL=https://<votre-site>.vercel.app npx expo start
```

Build Android (APK installable) avec le compte Expo : `npx eas-cli@latest build --platform android --profile preview` (variable `EXPO_PUBLIC_WEB_URL` à définir dans le projet EAS).

## Carte

Leaflet, sans clé d'API :
- fond **satellite détaillé** (Esri World Imagery, pour voir les champs) ou **plan** (OpenStreetMap) ;
- couches NASA GIBS au choix de l'année : végétation (NDVI MODIS), chaleur du sol (MODIS), humidité du sol (SMAP, depuis 2015) ;
- recherche de lieu (Nominatim, plusieurs résultats au choix), « Ma position » ;
- dessin de la parcelle : zoom automatique, surface en direct, fermeture en touchant le premier point, dernier point retirable, coins déplaçables ensuite ; la région est détectée d'après la parcelle.

Les images Esri sont soumises aux conditions d'utilisation d'Esri (attribution affichée sur la carte).

## Assistant IA

L'assistant reformule une rotation en langage simple et répond aux questions, à partir des seules données ForoSat ; le score reste calculé par les règles. Il appelle un fournisseur compatible OpenAI côté serveur (`/api/ia`), la clé ne part jamais dans le navigateur. Réglages dans `frontend/.env.example` : `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` (OpenRouter par défaut, avec NVIDIA Nemotron 3.5 Lightning puis Nemotron 3.5 Super en secours, gratuits ; `LLM_MODEL` accepte une liste séparée par des virgules, essayée dans l'ordre). En production, les ajouter dans Vercel, Settings > Environment Variables.

## Pipeline de données NASA

Dans `data/pipeline/` (Python 3 ; `build_ndvi.py` et `build_grace.py` demandent Pillow : `pip install pillow`) :

```bash
cd data/pipeline
python3 fetch_power.py        # télécharge NASA POWER (pluie, chaleur) de Korhogo vers data/raw/
python3 build_ndvi.py         # végétation NDVI MODIS mensuelle (NASA GIBS, sans compte) → data/raw/ndvi.json
python3 build_grace.py        # eau stockée GRACE / GRACE-FO (NASA GIBS, sans compte) → data/raw/grace.json
python3 build_regions.py      # climat réel des 33 régions et districts (data/regions/<id>.json), à relancer pour rafraîchir l'état du moment
python3 build_saisons.py      # 20 saisons réelles rejouées par culture (NASA POWER journalier, FAO-56) → data/saisons/<id>.json
python3 -m unittest test_indicators test_climat_complet test_ndvi_gibs test_grace_gibs test_saison test_build_saisons
```

Pour **les 31 régions et 2 districts** (au chef-lieu de chacun) : pluie, chaleur et humidité du sol mensuelles 2005–2025 (NASA POWER), une ou deux saisons des pluies, alertes par règles et état du moment sur les 30 derniers jours publiés. La végétation vient du NDVI mensuel MODIS Terra, lu dans les tuiles NASA GIBS sur un anneau de 7 à 18 km autour du chef-lieu (la campagne, pas la ville). L'eau stockée vient de GRACE / GRACE-FO (mascons JPL, 2005–2022), lue elle aussi dans NASA GIBS : moyenne annuelle en cm d'eau, lacune 2017–2018 entre les deux missions.

## Règles d'équipe

Une branche GitHub par membre, un push par jour, et tout blocage signalé le jour même dans le groupe.
