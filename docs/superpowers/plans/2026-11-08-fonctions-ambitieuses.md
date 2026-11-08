# Fonctions ambitieuses (chantier 3) — plan d'exécution

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rejouer chaque rotation sur 20 saisons réelles, la projeter vers 2050, alerter le téléphone quand semer, et confronter une photo du champ à la vue NASA.

**Architecture:**
- **Calculs lourds dans le pipeline Python, une seule fois.** Le moteur de saison (semis, bilan d'eau FAO-56, verdict) produit un verdict par culture, par année et par région, sur le réel (NASA POWER) comme sur les projections (NEX-GDDP-CMIP6).
- **Le site lit ces tables** et les assemble selon la rotation. Les verdicts sont donc identiques partout, et le navigateur ne charge pas 20 ans de données journalières.
- **Seul l'état de semis du moment est calculé en direct** en TypeScript (route `/api/semis`). L'app Expo l'interroge en tâche de fond.
- **Photo :** la route `/api/photo` combine un modèle de vision (OpenRouter) et le NDVI NASA GIBS.

**Tech Stack:**
- Python 3 (stdlib, Pillow, scipy pour lire le NetCDF-3), unittest ;
- Next.js 15, TypeScript 5.6, zod, Vitest, Playwright, pngjs ;
- Expo SDK 58 : expo-notifications, expo-background-task, expo-task-manager, expo-image-picker, expo-image-manipulator.

**Spec :** `docs/superpowers/specs/2026-11-08-fonctions-ambitieuses-design.md`. Écart validé à la planification : le moteur de saison vit **en Python seulement**, sans double TypeScript. Le site lit des verdicts précalculés, et seul l'état de semis en direct est en TypeScript (Task 7). La spec est mise à jour dans la Task 1.

## Global Constraints
- Interface et textes en français ; chaque valeur affichée cite sa source (NASA POWER, NEX-GDDP-CMIP6, MODIS/GIBS, FAO-56).
- Hypothèses affichées comme telles : réservoir du sol de 100 mm d'eau utile, durées et coefficients des stades FAO-56 « à valider par l'agronome ».
- Seuils de verdict : rapport ≥ 0,75 « bonne », de 0,5 à 0,75 « difficile », < 0,5 ou pas de semis « perdue » ; pas de rendement en kg.
- Règle de semis (Sivakumar) : premier jour où le cumul sur 3 jours atteint 20 mm, sans 7 jours secs (< 1 mm/j) dans les 20 jours suivants.
- Fenêtre de recherche : du 1er jour du mois de début de la saison principale jusqu'à la fin du 2e mois suivant.
- 2050 :
  - modèles IPSL-CM6A-LR, MRI-ESM2-0, GFDL-ESM4 ;
  - référence 1995–2014, futur 2041–2060 ;
  - scénarios SSP2-4.5 (« modéré ») et SSP5-8.5 (« pessimiste ») ;
  - boîte 4°N–11°N, 9°W–2,5°W ;
  - désaccord des modèles quand des écarts de signes opposés dépassent 5 points ;
  - mention « Projection, pas prévision ».
- Photo :
  - réduite à 1024 px, JPEG de qualité 0,7, 2 Mo au plus côté serveur ;
  - jamais enregistrée ;
  - position arrondie à 0,01° ;
  - modèle `nvidia/nemotron-3.5-super-vl:free` par défaut, réglable par `LLM_VISION_MODEL`.
- Alerte : tâche de fond toutes les 12 h, notification seulement au passage vers `fenetre_ouverte` ou `poche_seche`, jamais deux fois le même événement.
- Git : commits au nom `cheick adam Coulibaly <cheickadamcoulibaly001@gmail.com>`, sans mention de Claude. Poussés sur `main` et `claude/lucid-meitner-nofjvo` à la fin de chaque bloc, après les tests et `git merge-tree` sans conflit.
- Toute page reste ≤ 360 px de large en mode app ; animations limitées à 100, 150, 200 ou 300 ms, avec `prefers-reduced-motion` respecté.

## Review Focus
1. **Région à deux saisons** (sud, ex. Abidjan) : le rejeu et l'alerte suivent la saison principale (`saisonPluies`). Testé dans les Tasks 1 et 7.
2. **Jours manquants dans les données NASA** (`null`) : si plus de 10 % des jours du cycle manquent, la saison est exclue (verdict `null`), jamais comptée « perdue ». Testé dans la Task 1.
3. **Cycle qui dépasse la fin de la série** (manioc semé en 2025) : la saison est exclue, pas comptée perdue ; le total affiché est celui des saisons évaluées. Testé dans les Tasks 1 et 3.
4. **Modèle de vision qui entoure son JSON de texte ou de balises Markdown** : on extrait le premier objet JSON avant de valider ; sinon « Analyse impossible ». Testé dans la Task 11.
5. **Mois NDVI pas encore publié** (tuile GIBS 404 ou vide) : on recule d'un mois, 3 fois au plus, puis « Image satellite indisponible » ; la photo reste analysée. Testé dans la Task 10.

---

## Bloc 1 — Rejeu 20 saisons

### Task 1: Moteur de saison Python et stades FAO-56

**Files:**
- Create: `data/pipeline/saison.py`, `data/pipeline/test_saison.py`
- Modify: `knowledge/cultures.json` (champ `stades` pour les 8 cultures), `frontend/src/lib/contract/index.ts` (`CultureSchema.stades`), `docs/superpowers/specs/2026-11-08-fonctions-ambitieuses-design.md` (écart ci-dessus)
- Test: `data/pipeline/test_saison.py`, `frontend/tests/unit/cultures.test.ts`

**Interfaces:**
- Produces (Python) :
  - `ra_mm(lat: float, jour_annee: int) -> float` : rayonnement extraterrestre en mm/j (FAO-56 éq. 21 × 0,408) ;
  - `et0_hargreaves(tmax: float, tmin: float, ra: float) -> float` = 0,0023 · ra · (tmoy + 17,8) · √(tmax − tmin) ;
  - `date_semis(pluie: list[float | None], i_debut: int, i_fin: int) -> int | None` : indice du jour de semis ;
  - `bilan(pluie, tmax, tmin, lat, jour0: date, i_semis: int, culture: dict, reserve_mm: float = 100) -> dict | None` → `{"ratio": float, "pocheFloraison": int, "pocheMax": int}` ou `None` si les données sont insuffisantes ou si le cycle dépasse la série ;
  - `verdict_saison(jours: dict, lat: float, annee: int, saison: dict, culture: dict) -> dict | None` → `{"annee", "verdict": "bonne"|"difficile"|"perdue", "semis": "AAAA-MM-JJ"|None, "ratio": float|None, "cause": str}` ;
  - `jours = {"debut": "AAAA-MM-JJ", "pluie": [...], "tmax": [...], "tmin": [...]}`.
- Produces (JSON) : `cultures[i].stades = {"jours": [init, dev, mid, late], "kc": [ini, mid, end], "source": "FAO-56, tableaux 11 et 12 — à valider par l'agronome"}`. Les jours sont ramenés à `cycleJours` par règle de trois et arrondis ; le dernier stade absorbe l'arrondi.

- [ ] **Step 1: Écrire `stades` dans `knowledge/cultures.json`** (longueurs FAO-56 en jours, Kc ini/mid/end) :
  - Maïs 20/35/40/30, 0,3/1,2/0,6 ;
  - Sorgho 20/35/40/30, 0,3/1,0/0,55 ;
  - Riz 30/30/60/30, 1,05/1,2/0,9 ;
  - Arachide 25/35/45/25, 0,4/1,15/0,6 ;
  - Niébé 20/30/30/20, 0,4/1,05/0,6 ;
  - Coton 30/50/60/55, 0,35/1,15/0,6 ;
  - Manioc 20/40/90/60, 0,3/0,8/0,3 ;
  - Igname 20/30/60/40, 0,5/1,1/0,65, avec la source « approximation (absente de FAO-56) — à valider par l'agronome ».

  Ajouter `stades` (obligatoire) à `CultureSchema`, puis vérifier avec `cd frontend && npx vitest run tests/unit/cultures.test.ts`. Résultat attendu : PASS.
- [ ] **Step 2: Écrire les tests qui échouent** dans `test_saison.py` :
  - `test_ra_fao56` : `ra_mm(-20, 246)` ≈ 32,2 × 0,408 à 0,1 près (exemple 8 de FAO-56) ;
  - `test_et0_hargreaves` : `et0_hargreaves(30, 20, 15)` ≈ 0,0023·15·42,8·√10 à 0,01 près ;
  - `test_semis_ideal` : 3 jours de 8 mm à l'indice 10, puis 2 mm par jour → 12 ;
  - `test_faux_depart` : 25 mm à l'indice 5, puis 8 jours secs, puis un vrai départ à 30 → 30 ;
  - `test_pas_de_semis` : saison sèche → `None` ;
  - `test_saison_seche_perdue` : peu de pluie → « perdue » ;
  - `test_saison_ideale_bonne` : 6 mm/j pendant 120 jours → « bonne » ;
  - `test_poche_seche_floraison` : 10 jours secs en mi-saison → `cause` contient « 10 jours secs pendant la floraison » ;
  - `test_donnees_manquantes` : 15 % de `None` dans le cycle → `verdict_saison` renvoie `None` ;
  - `test_cycle_hors_serie` : semis à 100 jours de la fin pour le manioc (300 j) → `None` ;
  - `test_deux_saisons` : la `saison` passée est utilisée telle quelle (fenêtre = 1er du mois de début → fin du mois de début + 2).
- [ ] **Step 3: Lancer les tests et constater l'échec.** Commande : `cd data/pipeline && python3 -m unittest test_saison -v`. Résultat attendu : ImportError ou FAIL.
- [ ] **Step 4: Implémenter `saison.py`.**
  - Stress FAO-56 : Ks = 1 tant que l'épuisement est ≤ 50 % de la réserve, puis décroît linéairement jusqu'à 0 à la réserve vide.
  - ETa = Ks·Kc·ET0 ; Kc interpolé linéairement pendant le développement et la fin de cycle.
  - Ratio = Σ ETa / Σ ETc avec un poids 2 en mi-saison. Le réservoir démarre plein à moitié le jour du semis, et la pluie au-delà de la réserve est perdue.
  - Causes possibles :
    - « pas assez de pluie pour semer » ;
    - « N jours secs pendant la floraison du <culture minuscule> » quand la poche de floraison ≥ 7 ;
    - sinon « pluie insuffisante sur le cycle » (difficile ou perdue) ou « eau suffisante tout le cycle » (bonne).
- [ ] **Step 5: Lancer les tests et constater le succès.** Commande : `python3 -m unittest test_saison -v`. Résultat attendu : OK (11 tests).
- [ ] **Step 6: Mettre à jour la spec** (Bloc 1 : moteur en Python, verdicts précalculés ; Bloc 3 : seul l'état du moment est en TypeScript), puis commit avec le message `feat(pipeline): moteur de saison FAO-56 (semis, bilan d'eau, verdict)`.

### Task 2: Séries journalières réelles et tables de verdicts

**Files:**
- Modify: `data/pipeline/fetch_power.py` (ajout de `telecharger_serie`)
- Create: `data/pipeline/build_saisons.py`, `data/pipeline/test_build_saisons.py`, `data/saisons/<region>.json` (33)
- Modify: `README.md` (commandes)

**Interfaces:**
- Consumes : `verdict_saison` (Task 1), `frontend/src/lib/regions.json` (`id`, `lat`, `lon`), `data/regions/<id>.json` (`saisonPluies`).
- Produces :
  - `telecharger_serie(lat, lon, debut="20050101", fin="20251231") -> bytes` (PRECTOTCORR, T2M_MAX, T2M_MIN, communauté AG) ;
  - `serie_depuis_power(brut: dict) -> dict` au format `jours` de la Task 1, où −999 devient `None` ;
  - `table_region(jours, lat, saison, cultures) -> dict` ;
  - fichier `data/saisons/<id>.json` = `{"meta": {"region", "source": "NASA POWER (journalier)", "periode": "2005–2025", "saison": {"debut", "fin"}, "reserveMm": 100}, "cultures": {"<nom>": [verdict_saison…]}}`, sans les saisons `None` ;
  - les séries brutes restent dans `data/raw/jours/<id>.json`.

- [ ] **Step 1: Écrire les tests qui échouent** :
  - `test_serie_depuis_power` : extrait de 5 jours avec un −999 → `None` à la bonne place, `debut` correct ;
  - `test_table_region_exclut_none` : une culture dont une année renvoie `None` n'a pas cette année dans la liste.
- [ ] **Step 2: Lancer les tests et constater l'échec.** Commande : `python3 -m unittest test_build_saisons -v`. Résultat attendu : FAIL.
- [ ] **Step 3: Implémenter `telecharger_serie`, `serie_depuis_power`, `table_region` et `main()`** (33 régions, 4 threads, reprise si `data/raw/jours/<id>.json` existe déjà).
- [ ] **Step 4: Lancer les tests et constater le succès**, puis exécuter `python3 build_saisons.py`. Résultat attendu : 33 fichiers dans `data/saisons/`, chacun avec 8 cultures et au moins 18 saisons pour le maïs.
- [ ] **Step 5: Vérifier un ordre de grandeur, puis commit.** Au Poro, le maïs doit avoir une majorité de saisons « bonne » ; au Bounkani (nord-est, plus sec), il doit avoir plus de saisons « perdue » qu'à l'Agnéby-Tiassa. Commit avec le message `feat(data): verdicts de 20 saisons réelles par culture pour les 33 régions`.

### Task 3: Rejeu d'une rotation dans le moteur du site

**Files:**
- Create: `frontend/src/lib/moteur/rejeu.ts`, `frontend/src/app/api/saisons/[region]/route.ts`, `frontend/tests/unit/rejeu.test.ts`
- Modify:
  - `frontend/src/lib/contract/index.ts` (`SaisonsSchema`) ;
  - `frontend/src/lib/data/index.ts` (`getSaisons`) ;
  - `frontend/src/lib/moteur/{notes,explications,rotations}.ts` ;
  - `frontend/src/lib/useRotations.ts` ;
  - `frontend/src/app/api/ia/route.ts` ;
  - `frontend/src/lib/ia/assistant.ts` (`rotationDepuisDemande` prend `saisons`).

**Interfaces:**
- Consumes : le format `data/saisons/<id>.json` (Task 2).
- Produces :
  - `SaisonsSchema`, `type Saisons`, `type VerdictSaison = { annee: number; verdict: "bonne"|"difficile"|"perdue"; semis: string|null; ratio: number|null; cause: string }` ;
  - `getSaisons(region: string): Promise<Saisons>` (même validation d'identifiant que `getClimatRegion`), lu dans `FOROSAT_SAISONS_DIR` ou `../data/saisons` ;
  - `GET /api/saisons/[region]` statique, comme `/api/climat` ;
  - `rejouer(sequence: string[], saisons: Saisons): Rejeu` avec `Rejeu = { saisons: (VerdictSaison & { culture: string })[]; bonnes: number; difficiles: number; perdues: number; total: number; pire: (VerdictSaison & { culture: string }) | null }`. Pour chaque année a de 2005 à 2025, la culture est `sequence[(a − 2005) % sequence.length]` ; une année absente pour cette culture est ignorée. La pire saison est la « perdue » au plus petit ratio, sinon la « difficile » ;
  - `calculerRotations(p, climat, cultures, saisons?: Saisons)` : chaque `RotationCalculee` porte `rejeu?: Rejeu` ;
  - la note de sécheresse devient `round((noteFiche + 1 + 4 · bonnes/total) / 2)` quand le rejeu existe ;
  - `confiance(cl, rejeu?)` : historique = 5 si `total ≥ 18`, 4 si ≥ 10, 2 sinon ;
  - `useRotations` charge `/api/saisons/<region>` en parallèle du climat. Si cet appel échoue, les rotations restent calculées sans rejeu, et la lacune ajoute « rejeu des saisons indisponible ».

- [ ] **Step 1: Écrire les tests qui échouent** (`rejeu.test.ts`) :
  - `rejouer` alterne les cultures par année ;
  - les comptes sont exacts ;
  - une année absente (cycle hors série) est ignorée et n'est pas comptée ;
  - la pire saison est bien choisie ;
  - `calculerRotations` avec `saisons` donne une note de sécheresse différente de celle sans `saisons` pour une région sèche ;
  - `confiance` avec `total = 12` donne historique 4 ;
  - `getSaisons("../x")` est rejeté ;
  - le fichier réel `data/saisons/poro.json` respecte `SaisonsSchema`.
- [ ] **Step 2: Lancer les tests et constater l'échec.** Commande : `cd frontend && npx vitest run tests/unit/rejeu.test.ts`. Résultat attendu : FAIL.
- [ ] **Step 3: Implémenter** contrat, données, route, `rejeu.ts` et intégration (notes, confiance, `useRotations`, route IA).
- [ ] **Step 4: Lancer toute la suite et le typage.** Commande : `npx vitest run && npx tsc --noEmit`. Résultat attendu : tout passe.
- [ ] **Step 5: Commit** avec le message `feat(moteur): rotations rejouées sur 20 saisons réelles`.

### Task 4: Frise du rejeu à l'écran

**Files:**
- Create: `frontend/src/components/FriseRejeu.tsx`, `frontend/tests/unit/frise-rejeu.test.tsx`
- Modify: `frontend/src/components/RotationDetail.tsx`, `frontend/src/components/RotationCard.tsx`, `frontend/tests/e2e/parcours.spec.ts`

**Interfaces:**
- Consumes : `Rejeu` (Task 3).
- Produces : `FriseRejeu({ rejeu }: { rejeu: Rejeu })`.

- [ ] **Step 1: Écrire les tests qui échouent** :
  - Vitest :
    - la phrase « 18 bonnes saisons sur 20 » ;
    - une pastille par saison, en `button` avec `aria-label` « 2015 : saison perdue, maïs » ;
    - le toucher affiche le détail (« semis le 12 juin », cause) ;
    - la légende « Hypothèse : réservoir du sol de 100 mm » et la source « NASA POWER, journalier, 2005–2025 » ;
    - sans rejeu, rien n'est affiché.
  - e2e : sur `/rotations/B`, la section « Rejouée sur 20 saisons réelles » est visible, et une pastille cliquée affiche son détail.
- [ ] **Step 2: Lancer les tests et constater l'échec.** Commande : `npx vitest run tests/unit/frise-rejeu.test.tsx`. Résultat attendu : FAIL.
- [ ] **Step 3: Implémenter.**
  - Pastilles de 22 px dans une grille qui revient à la ligne ; couleurs vert `#009E60`, orange `#F77F00`, rouge `#C2410C`.
  - Apparition échelonnée avec la classe `seg-grow` existante.
  - Section placée sur le détail entre « Le calendrier sur 3 ans » et les données.
  - Sur la carte, ajouter une ligne « 20 saisons rejouées : 18 bonnes » sous la note.
- [ ] **Step 4: Lancer les tests et constater le succès**, avec `npx vitest run` et `npx playwright test --trace off`. Résultat attendu : tout passe, y compris le test des 360 px.
- [ ] **Step 5: Commit, puis pousser le bloc 1** (tests verts, `git merge-tree` sans conflit, push sur `main` et sur la branche). Message : `feat(rotations): frise des 20 saisons rejouées`.

## Bloc 2 — Votre champ vers 2050

### Task 5: Projections CMIP6 dans le pipeline

**Files:**
- Create: `data/pipeline/cmip6.py`, `data/pipeline/test_cmip6.py`, `data/pipeline/build_projections.py`, `data/pipeline/fixtures/cmip6_extrait.nc` (3 jours, boîte complète, ≤ 100 Ko), `data/projections/<region>.json` (33)
- Modify: `README.md` (`pip install pillow scipy`, commande)

**Interfaces:**
- Consumes : `verdict_saison` (Task 1), `regions.json`, `data/regions/<id>.json` (`saisonPluies`), `knowledge/cultures.json`.
- Produces :
  - `MODELES = ["IPSL-CM6A-LR", "MRI-ESM2-0", "GFDL-ESM4"]`, `SCENARIOS = {"ssp245": "modéré", "ssp585": "pessimiste"}`, `REFERENCE = range(1995, 2015)`, `FUTUR = range(2041, 2061)` ;
  - `nom_fichier(modele, scenario, variable, annee, lister) -> str` : choisit la dernière version (`_v2.0` > `_v1.1` > sans suffixe) parmi les clés S3 renvoyées par `lister(prefixe)`. La liste vient de `https://nex-gddp-cmip6.s3.us-west-2.amazonaws.com/?list-type=2&prefix=NEX-GDDP-CMIP6/<modele>/<scenario>/r1i1p1f1/<var>/` ;
  - `url_ncss(chemin) -> str` = `https://ds.nccs.nasa.gov/thredds/ncss/grid/AMES/NEX/GDDP-CMIP6/<chemin>?var=<v>&north=11&south=4&west=-9&east=-2.5&temporal=all&accept=netcdf3` ;
  - `lire_points(nc_bytes, variable, points: dict[str, tuple[float, float]]) -> dict[str, list[float]]` : lecture par `scipy.io.netcdf_file`, maille la plus proche, longitudes en 0–360 ou −180–180 gérées. Conversions : pr × 86400 en mm/j, tas − 273,15 en °C ;
  - `part_bonnes(verdicts: list[dict]) -> float` ;
  - `data/projections/<id>.json` = `{"meta": {"source": "NASA NEX-GDDP-CMIP6 v2.0 (NCCS)", "modeles", "scenarios", "reference": "1995–2014", "futur": "2041–2060"}, "cultures": {"<nom>": {"ssp245"|"ssp585": {"<modele>": {"reference": float, "futur": float}}}}}`. Les parts sont arrondies au centième ; la référence vient de la série `historical`.

- [ ] **Step 1: Récupérer l'extrait** (un appel NCSS sur 3 jours, avec `time_start`/`time_end`) dans `fixtures/cmip6_extrait.nc`, puis écrire les tests qui échouent :
  - `test_lire_points` : valeurs finies au Poro, pluie ≥ 0 en mm/j, température entre 15 et 45 °C ;
  - `test_nom_fichier_version` : avec `_v2.0`, `_v1.1` et sans suffixe, c'est `_v2.0` qui est choisi ;
  - `test_url_ncss` : l'URL contient la boîte, `temporal=all` et `netcdf3` ;
  - `test_part_bonnes`.
- [ ] **Step 2: Lancer les tests et constater l'échec.** Commande : `pip install scipy && python3 -m unittest test_cmip6 -v`. Résultat attendu : FAIL.
- [ ] **Step 3: Implémenter `cmip6.py` et `build_projections.py`.**
  - 540 téléchargements, 6 threads, 3 essais avec attente progressive.
  - Points extraits gardés dans `data/raw/cmip6/<modele>_<scenario>_<var>_<annee>.json` pour pouvoir reprendre.
  - Pour chaque région et chaque culture : `verdict_saison` sur chaque année.
- [ ] **Step 4: Lancer les tests et constater le succès**, puis exécuter `python3 build_projections.py`. Résultat attendu : 33 fichiers. Vérifier un ordre de grandeur : la référence du maïs au Poro est du même ordre que la part réelle de la Task 2, à ±0,25 près ; sinon, examiner les unités avant de continuer.
- [ ] **Step 5: Commit** avec le message `feat(data): projections 2050 (NEX-GDDP-CMIP6, 3 modèles, 2 scénarios)`.

### Task 6: Section « Votre champ vers 2050 »

**Files:**
- Create: `frontend/src/lib/moteur/projection.ts`, `frontend/src/app/api/projections/[region]/route.ts`, `frontend/src/components/Projection2050.tsx`, `frontend/tests/unit/projection.test.tsx`
- Modify: `contract/index.ts` (`ProjectionsSchema`), `data/index.ts` (`getProjections`), `useRotations.ts` (chargement des projections), `rotations.ts` (champ `projection?`, badge), `RotationDetail.tsx`, `RotationCard.tsx`, `tests/e2e/parcours.spec.ts`

**Interfaces:**
- Consumes : `Rejeu` (Task 3), le format des projections (Task 5).
- Produces :
  - `projeter(sequence: string[], rejeu: Rejeu, p: Projections): Projection` avec `Projection = { aujourdhui: number; total: number; scenarios: Record<"ssp245"|"ssp585", { min: number; max: number; desaccord: boolean }> }` ;
  - l'écart d'un modèle est la moyenne, sur les cultures de la séquence, de `futur − reference` ; on calcule `bonnes = round(clamp(bonnes_reelles/total + écart, 0, 1) · total)`, puis le min et le max sur les 3 modèles ;
  - `desaccord` est vrai si un écart est > +0,05 et un autre < −0,05 ;
  - `phrase2050(rotations: RotationCalculee[]): string` (règles) ;
  - `RotationCalculee.tient2050?: true` pour la rotation dont le `min` pessimiste est le plus haut (une seule).

- [ ] **Step 1: Écrire les tests qui échouent** :
  - `projeter` avec des écarts −0,2, −0,1 et −0,15 → fourchette exacte, sans désaccord ;
  - écarts +0,1 et −0,1 → `desaccord` vrai, et la phrase contient « les modèles ne s'accordent pas » ;
  - le badge va à une seule rotation ;
  - le fichier réel `data/projections/poro.json` respecte `ProjectionsSchema` ;
  - `Projection2050` affiche « Projection, pas prévision », un sélecteur à 2 boutons `aria-pressed`, et 3 barres légendées « aujourd'hui (mesuré) », « vers 2050 — modéré », « vers 2050 — pessimiste » ;
  - e2e : sur `/rotations/B`, le clic sur « pessimiste » change la barre mise en avant.
- [ ] **Step 2: Lancer les tests et constater l'échec.**
- [ ] **Step 3: Implémenter.** Chargement des projections : même modèle que les saisons ; en cas d'échec, la section est absente et la lacune ajoute « projections 2050 indisponibles ».
- [ ] **Step 4: Lancer toute la suite (Vitest, tsc, Playwright) et constater le succès.**
- [ ] **Step 5: Commit, puis pousser le bloc 2.** Message : `feat(rotations): projection vers 2050 et badge « tient en 2050 »`.

## Bloc 3 — Alerte « semez maintenant »

### Task 7: État de semis en direct (site)

**Files:**
- Create: `frontend/src/lib/moteur/etat-semis.ts`, `frontend/src/app/api/semis/[region]/route.ts`, `frontend/src/lib/useSemis.ts`, `frontend/tests/unit/etat-semis.test.ts`
- Modify: `frontend/src/components/Tableau.tsx` (carte du haut), `frontend/tests/e2e/parcours.spec.ts`

**Interfaces:**
- Produces :
  - `type EtatSemis = "seche" | "premieres_pluies" | "fenetre_ouverte" | "poche_seche"` ;
  - `etatSemis(jours: { date: string; pluie: number | null }[], saison: { debut: number; fin: number }): { etat: EtatSemis; depuis?: string; message: string }`. Règles :
    - le plus récent jour où le cumul sur 3 jours atteint 20 mm ouvre la fenêtre ;
    - 7 jours secs consécutifs après cette ouverture → `poche_seche` ;
    - sinon, une pluie d'au moins 1 mm dans les 10 derniers jours → `premieres_pluies` ;
    - sinon `seche`, avec « pluies attendues vers <mois de début> » ;
  - `GET /api/semis/[region]` : POWER journalier (PRECTOTCORR) des 30 derniers jours, `revalidate = 21600`. Réponse `{ etat, depuis?, message, dateDonnees }` ; région inconnue → 404 ; POWER en erreur → 503 `{ erreur: "Données NASA POWER indisponibles pour le moment." }` ;
  - `useSemis(region): { statut: "pret"; etat: … } | { statut: "chargement" } | { statut: "erreur" }`.

- [ ] **Step 1: Écrire les tests qui échouent** :
  - les 4 états sur des séries fabriquées ;
  - région à deux saisons : le mois cité est celui de `saisonPluies` ;
  - jours `null` ignorés ;
  - route : POWER simulé (`fetch` remplacé) en panne → 503 ;
  - e2e : `page.route("**/api/semis/**")` simulé sur `fenetre_ouverte` → l'Accueil affiche « Fenêtre de semis ouverte ».
- [ ] **Step 2: Lancer les tests et constater l'échec.**
- [ ] **Step 3: Implémenter.** Sur l'Accueil, le bandeau d'état remplace le libellé de saison quand l'état est chargé ; en cas d'erreur, l'affichage actuel reste (saison calculée).
- [ ] **Step 4: Lancer les tests et constater le succès.**
- [ ] **Step 5: Commit** avec le message `feat(semis): état de semis en direct (NASA POWER) sur l'accueil`.

### Task 8: Pont site → app pour l'alerte

**Files:**
- Modify: `frontend/src/lib/modeApp.ts`, `frontend/src/components/Tableau.tsx`, `frontend/tests/unit/synchro-app.test.tsx`
- Create: `frontend/src/components/AlerteSemis.tsx`

**Interfaces:**
- Produces (messages) :
  - vers l'app :
    - `{ type: "parcelle"; region: string; culture: string | null }`, envoyé par l'Accueil à chaque affichage ; la culture vient de `prochaineCulture(reco)` ;
    - `{ type: "alerte"; action: "activer" | "desactiver" | "tester" }` ;
  - depuis l'app : `{ type: "alerte"; etat: "active" | "inactive" | "refus" }`, que `ecouterNatif` doit accepter et valider ;
  - `AlerteSemis()` est rendu seulement en mode app avec le pont natif : interrupteur « M'alerter quand semer » (`role="switch"`) et bouton « Tester l'alerte ».

- [ ] **Step 1: Écrire les tests qui échouent** :
  - hors app, `AlerteSemis` n'affiche rien ;
  - en app, le message `parcelle` part au rendu de l'Accueil ;
  - l'interrupteur envoie `activer`, et la réponse `refus` affiche « Notifications refusées : activez-les dans les réglages du téléphone » ;
  - un message `alerte` mal formé est ignoré.
- [ ] **Step 2: Lancer les tests et constater l'échec.**
- [ ] **Step 3: Implémenter.**
- [ ] **Step 4: Lancer les tests et constater le succès.**
- [ ] **Step 5: Commit** avec le message `feat(app): pont pour l'alerte de semis`.

### Task 9: Tâche de fond et notifications (app Expo)

**Files:**
- Create: `mobile/lib/alerte.ts` (logique pure), `mobile/lib/tacheSemis.ts` (tâche de fond)
- Modify: `mobile/app/_layout.tsx` (import de la tâche), `mobile/components/PageWeb.tsx`, `mobile/app.json` (plugins), `mobile/package.json`
- Test: `<scratchpad>/alerte.test.mjs` (Node, comme pour `onglets.ts`)

**Interfaces:**
- Consumes : `GET <WEB_URL>/api/semis/<region>` (Task 7) ; les messages de la Task 8.
- Produces :
  - `decider(precedent: { etat: string; depuis?: string } | null, actuel: { etat: string; depuis?: string }): boolean` : vrai seulement si `actuel.etat` vaut `fenetre_ouverte` ou `poche_seche` et que le couple (état, depuis) diffère du précédent ;
  - `texteAlerte(region: string, culture: string | null, etat): { titre: string; corps: string }` (« Poro : les pluies sont installées. C'est le moment de semer le maïs. » / « Poro : poche sèche en cours, attendez avant de semer. ») ;
  - AsyncStorage : `forosat.alerte` = `{ active, region, culture, dernier }` ;
  - `TACHE = "forosat-semis"`, enregistrée avec `minimumInterval: 720` (minutes).

- [ ] **Step 1: Installer les modules natifs.** Commande : `cd mobile && npx expo install expo-notifications expo-background-task expo-task-manager`. Ajouter `expo-notifications` aux plugins.
- [ ] **Step 2: Écrire les tests qui échouent** pour `decider` et `texteAlerte` :
  - `null` → `fenetre_ouverte` : vrai ;
  - même état et même `depuis` : faux ;
  - nouvelle date : vrai ;
  - `premieres_pluies` : faux.
- [ ] **Step 3: Lancer les tests et constater l'échec.** Commande : `node --experimental-strip-types <scratchpad>/alerte.test.mjs mobile/lib/alerte.ts`. Résultat attendu : erreur.
- [ ] **Step 4: Implémenter.**
  - `alerte.ts`.
  - `tacheSemis.ts` : `TaskManager.defineTask`, lecture du stockage, appel de l'API, `decider`, notification locale, mise à jour de `dernier`. Toute erreur réseau est ignorée sans changer l'état.
  - `PageWeb` :
    - `parcelle` → stockage ;
    - `activer` → demande d'autorisation, enregistrement de la tâche, puis réponse `active` ou `refus` ;
    - `desactiver` → désinscription et réponse `inactive` ;
    - `tester` → appel immédiat de l'API et notification avec l'état réel.
  - Canal Android « Semis » de haute importance.
- [ ] **Step 5: Lancer le test Node, puis `npx tsc --noEmit`, `npm run lint` et `npx expo-doctor`.** Résultat attendu : succès ; les seules erreurs `expo-doctor` tolérées sont celles du réseau.
- [ ] **Step 6: Commit, puis pousser le bloc 3.** Message : `feat(mobile): alerte « semez maintenant » en tâche de fond`.

## Bloc 4 — Photo + satellite

### Task 10: NDVI au point (TypeScript, GIBS)

**Files:**
- Create: `frontend/src/lib/satellite/ndvi.ts`, `frontend/tests/unit/ndvi.test.ts`, `frontend/tests/fixtures/gibs_ndvi_tuile.png` (une vraie tuile du Poro)
- Modify: `frontend/package.json` (`pngjs`, `@types/pngjs`)

**Interfaces:**
- Consumes : `data/pipeline/fixtures/gibs_ndvi_colormap.xml` (copie lue au chargement du module) ; `COUCHE`, `ZOOM` (7) et `URL` identiques à `ndvi_gibs.py`.
- Produces :
  - `chargerPalette(xml: string): Map<string, number | null>` (clé `"r,g,b"`) ;
  - `positionTuile(lat, lon, z = 7): { x; y; px; py }` ;
  - `ndviFenetre(png: Buffer, px: number, py: number, palette): number | null` : moyenne sur 3 × 3 pixels valides ;
  - `ndviParcelle(lat: number, lon: number, aujourdhui: Date, lire: (url: string) => Promise<Buffer | null>): Promise<{ ndvi: number; mois: string } | null>`. Il essaie le mois précédent, puis recule de 3 mois au plus.

- [ ] **Step 1: Écrire les tests qui échouent** :
  - `chargerPalette` donne les mêmes valeurs que le Python sur 3 couleurs connues de la palette ;
  - `positionTuile` donne le même résultat que `position_tuile` du Python au Poro (valeurs codées dans le test) ;
  - `ndviFenetre` sur la tuile du dépôt renvoie une valeur entre 0 et 1 ;
  - `ndviParcelle` avec `lire` qui renvoie `null` pour les 2 premiers mois → utilise le 3e et renvoie son `mois` ;
  - 4 échecs de suite → `null`.
- [ ] **Step 2: Lancer les tests et constater l'échec.**
- [ ] **Step 3: Implémenter.**
- [ ] **Step 4: Lancer les tests et constater le succès.**
- [ ] **Step 5: Commit** avec le message `feat(satellite): NDVI MODIS au point de la parcelle`.

### Task 11: Route `/api/photo` (vision + comparaison)

**Files:**
- Create: `frontend/src/lib/ia/vision.ts`, `frontend/src/lib/satellite/comparer.ts`, `frontend/src/app/api/photo/route.ts`, `frontend/tests/unit/photo.test.ts`
- Modify: `frontend/.env.example` (`LLM_VISION_MODEL`)

**Interfaces:**
- Consumes : `configDepuisEnv` (`lib/ia/assistant.ts`) pour la clé et l'URL ; `ndviParcelle` (Task 10) ; `getClimatRegion` (normale NDVI du mois, onglet `veg`).
- Produces :
  - `AnalysePhotoSchema = z.object({ culture: z.enum([...8 cultures, "inconnue", "aucune"]), couvertureSol: z.number().min(0).max(100), etat: z.enum(["vigoureux", "jaunissement", "sec", "sol_nu"]), remarque: z.string().max(160) })` ;
  - `extraireJson(texte: string): unknown | null` : premier objet `{…}`, avec ou sans balises Markdown ;
  - `analyserPhoto(image: string, deps: { config: ConfigIA; modele: string; fetch }): Promise<AnalysePhoto | null>`. La requête porte `response_format: { type: "json_object" }` et `reasoning: { effort: "low", exclude: true }`, et la consigne impose « inconnue » en cas de doute ;
  - `comparer(a: AnalysePhoto, ndvi: number | null, normale: number | null): { verdict: "concordent" | "divergent" | "satellite_indisponible"; raisons: string[] }`. « concordent » si NDVI ≥ 0,5 et couverture ≥ 60, ou NDVI < 0,3 et couverture < 30. Les raisons d'un désaccord sont : « le pixel satellite (environ 1 km) voit aussi les champs voisins », « l'image satellite date du mois de <mois>, pas du jour de la photo » et « des nuages ont pu masquer le sol » ;
  - `POST /api/photo` avec le corps `{ image: string (data:image/jpeg;base64,…, ≤ 2 800 000 caractères), lat: number, lon: number, region: string }`. Réponses :
    - 200 `{ analyse, satellite: { ndvi, mois, normale } | null, comparaison }` ;
    - 413 si l'image est trop lourde ;
    - 400 si le corps est invalide ;
    - 422 `{ erreur: "Analyse impossible, reprenez la photo de plus loin, en plein jour." }` ;
    - 503 si la clé est absente.

    La position est arrondie à 0,01° avant tout appel, et rien n'est enregistré ni journalisé de l'image.

- [ ] **Step 1: Écrire les tests qui échouent** :
  - `extraireJson` gère un JSON nu, un JSON en bloc Markdown, du texte autour du JSON, et du texte sans JSON (`null`) ;
  - le schéma rejette une couverture de 140 ;
  - `comparer` donne les deux cas « concordent », un cas « divergent » avec ses 3 raisons, et « satellite_indisponible » ;
  - route : image de 3 Mo → 413 ; modèle simulé renvoyant du texte → 422 ; cas complet simulé → 200 avec une position arrondie dans l'URL GIBS appelée.
- [ ] **Step 2: Lancer les tests et constater l'échec.**
- [ ] **Step 3: Implémenter.**
- [ ] **Step 4: Lancer les tests et constater le succès.**
- [ ] **Step 5: Commit** avec le message `feat(photo): analyse de la photo et comparaison au NDVI NASA`.

### Task 12: Écran photo (site + app)

**Files:**
- Create: `frontend/src/components/PhotoChamp.tsx`, `frontend/src/lib/photo/reduire.ts`, `frontend/tests/unit/photo-champ.test.tsx`
- Modify:
  - `frontend/src/components/ParcelleView.tsx` (section sous le formulaire) ;
  - `frontend/src/lib/modeApp.ts` (messages `photo`) ;
  - `mobile/components/PageWeb.tsx`, `mobile/app.json` (permission caméra), `mobile/package.json` ;
  - `frontend/tests/e2e/parcours.spec.ts`.

**Interfaces:**
- Consumes : `POST /api/photo` (Task 11), le centre du contour dessiné ou la position GPS de `CarteParcelle` (exposé par le contexte de la parcelle s'il existe, sinon le chef-lieu de la région).
- Produces :
  - messages : vers l'app `{ type: "photo" }` ; depuis l'app `{ type: "photo"; image: string } | { type: "photo"; erreur: "refus" | "annule" }` ;
  - `reduire(fichier: Blob, cote = 1024, qualite = 0.7): Promise<string>` : URL de données JPEG, via un canvas ;
  - `PhotoChamp({ region, lat, lon })` affiche :
    - l'avertissement de vie privée avant le bouton ;
    - le bouton « Photographier mon champ », qui envoie `photo` à l'app, ou ouvre un `input type=file accept=image/*` dans le navigateur ;
    - les cartes « Ce que voit votre téléphone » et « Ce que voit la NASA », puis le verdict et le lien vers `/rotations` ;
    - si `etat` vaut `sol_nu` pendant la saison des pluies de la région, la phrase « Sol nu en pleine saison : une culture de couverture (niébé, arachide) protège le sol », avec un lien vers la rotation conseillée.
  - Dans l'app : `expo-image-picker` `launchCameraAsync`, puis `expo-image-manipulator` (1024 px, compression 0,7, base64), et une réponse à la page.

- [ ] **Step 1: Écrire les tests qui échouent** :
  - hors app, le bouton ouvre le champ fichier ;
  - en app, il envoie `{ type: "photo" }` ;
  - la réponse `refus` affiche « Appareil photo refusé » ;
  - une réponse 422 affiche le message d'erreur ;
  - une réponse 200 affiche les 2 cartes et le verdict ;
  - e2e avec `/api/photo` simulé et `setInputFiles` sur une petite image : les cartes s'affichent, et la page fait ≤ 360 px en mode app.
- [ ] **Step 2: Lancer les tests et constater l'échec.**
- [ ] **Step 3: Implémenter le site, puis l'app** (`npx expo install expo-image-picker expo-image-manipulator` ; plugin `expo-image-picker` avec le texte de permission caméra en français).
- [ ] **Step 4: Lancer toute la suite (Vitest, tsc, Playwright) ; côté mobile, `tsc`, lint et `expo-doctor`.**
- [ ] **Step 5: Commit, puis pousser le bloc 4.** Message : `feat(photo): photo du champ confrontée au satellite (site et app)`.

### Task 13: Build APK et documentation

**Files:**
- Modify: `README.md` (rejeu, 2050, alerte, photo : sources et commandes), `docs/contrat-donnees.md` (saisons, projections, semis, photo)

- [ ] **Step 1: Mettre à jour la documentation**, puis commit avec le message `docs: chantier 3`.
- [ ] **Step 2: Lancer le build Android.** Commande : `cd mobile && EXPO_TOKEN=proxy-injected npx eas-cli@latest build -p android --profile preview --non-interactive --no-wait --json`. Le suivre jusqu'à `FINISHED`, puis donner le lien de l'APK.
- [ ] **Step 3: Revue finale de toute la branche** par un relecteur neuf, sur le modèle le plus capable. Corriger les points bloquants en TDD, puis pousser sur `main`.
