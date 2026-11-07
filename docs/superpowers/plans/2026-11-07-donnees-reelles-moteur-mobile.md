# Données réelles, moteur de score et app mobile — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer toute donnée de démonstration par des données NASA réelles ou des calculs par règles visibles, et livrer une app mobile Expo (coque native + WebView).

**Architecture:** Un moteur TypeScript pur (`frontend/src/lib/moteur/`) calcule les 3 rotations dans le navigateur à partir de la parcelle, du climat régional et des fiches cultures (`knowledge/cultures.json`). Le pipeline Python produit tout le climat régional (pluie, chaleur, humidité du sol, alertes, état du moment) depuis NASA POWER, sans modèle d'exemple. L'app `mobile/` (Expo Router) affiche les pages du site en mode `?app=1` et fournit GPS et partage natifs par messages.

**Tech Stack:** Next.js 15, TypeScript, zod, Vitest, Playwright · Python 3 (stdlib, unittest) · Expo (Expo Router, react-native-webview, expo-location), EAS Build.

**Spec:** `docs/superpowers/specs/2026-11-07-donnees-reelles-moteur-mobile-design.md`

## Global Constraints
- Aucune valeur inventée à l'écran : chaque valeur vient d'une source citée ou d'une règle écrite ; ce qui manque est masqué, pas simulé.
- Fiches cultures : chaque valeur porte sa source ; revenu et marché sont des hypothèses, marquées comme telles ; `aValider: true` sur chaque fiche.
- NDVI et GRACE : optionnels dans le contrat, blocs masqués tant que le jeton Earthdata n'existe pas.
- Interface en français ; règles de mouvement et d'accessibilité existantes inchangées.
- Commits au nom de l'utilisateur (identité git du dépôt), sans mention de Claude ; push sur `main` seulement après tests verts et vérification de conflit.
- Jetons (Expo, Earthdata) uniquement par le formulaire sécurisé de l'environnement, jamais dans le dépôt ni le chat.

## Review Focus
- Une seule culture saisie (monoculture) : rotation actuelle d'une culture, notée normalement, pas de plantage.
- Climat régional injoignable (réseau coupé) : page Rotations avec message de reprise, pas d'écran blanc.
- Lien de fiche partagé avec paramètres manquants ou invalides : page « lien incomplet » avec retour à l'accueil.
- Derniers jours NASA POWER manquants (`-999`) : l'état du moment ignore ces jours ; s'il reste moins de 20 jours, les tuiles sont masquées.
- App mobile sans réseau : écran « hors connexion » avec « Réessayer ».

---

## File Structure
```
knowledge/cultures.json                         fiches des 8 cultures (sourcées)
frontend/src/lib/contract/index.ts              + CultureSchema ; Climat : grace/onglet veg optionnels ; Rotation.sequence min 1
frontend/src/lib/moteur/climat.ts               extraireClimat()
frontend/src/lib/moteur/notes.ts                notes par critère
frontend/src/lib/moteur/rotations.ts            calculerRotations()
frontend/src/lib/moteur/explications.ts         pourquoi, risques, lacunes, confiance, calendrier
frontend/src/lib/moteur/fiche-lien.ts           lienFiche() / lireLienFiche()
frontend/src/lib/useClimatRegion.ts             hook partagé (extrait de ClimatVue)
frontend/src/components/RotationsVue.tsx, RotationDetail.tsx, FicheVue.tsx
frontend/src/lib/modeApp.ts, components/ModeApp.tsx   mode ?app=1 et pont natif
data/pipeline/build_regions.py, climat_complet.py, etat_du_moment.py
data/regions/<id>.json                          climat complet par région (seule source climat)
mobile/                                         app Expo
```
Supprimés : `data/pilot/korhogo/climat.json`, `data/pilot/korhogo/rotations.json`, `getRotations/getRotation`.

---

### Task 1: Fiches cultures et contrat

**Files:** Create `knowledge/cultures.json` · Modify `frontend/src/lib/contract/index.ts`, `frontend/src/lib/data/index.ts` · Test `frontend/tests/unit/cultures.test.ts`

**Interfaces — Produces:**
- `CultureSchema` / `Culture` : `{ nom: string; famille: "poacées"|"fabacées"|"malvacées"|"dioscoréacées"|"euphorbiacées"; cycleJours: number; eauMm: [number, number]; legumineuse: boolean; secheresse: 1..5; chaleur: 1..5; couverture: 1..5; fourrage: 1..5; travailSol: 1..5; revenu: 1..5; marche: 1..5; sources: string[]; hypotheses: ("revenu"|"marche")[]; aValider: true }`, `CulturesSchema` (length 8).
- `getCultures(): Promise<Culture[]>` (lit `knowledge/cultures.json`).

- [ ] **Step 1: Test** `cultures.test.ts` : 8 cultures dont les noms sont exactement `CULTURES` de `lib/parcelle/validate` ; arachide et niébé `legumineuse: true`, les autres `false` ; chaque fiche a `sources.length ≥ 1`, `aValider: true`, `hypotheses` contient `"revenu"` et `"marche"` ; `eauMm[0] < eauMm[1]` ; une fiche avec `secheresse: 6` est rejetée.
- [ ] **Step 2: Run** `cd frontend && npx vitest run tests/unit/cultures.test.ts` → FAIL (module absent).
- [ ] **Step 3: Implement** le schéma, `getCultures`, et remplir `cultures.json` à partir de FAO ECOCROP (cycle, besoin en eau) et de références agronomiques publiques (familles, légumineuses) ; notes 1–5 qualitatives avec la source « estimation ForoSat d'après <source> ». Revenu et marché listés dans `hypotheses`.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `feat: fiches des 8 cultures (sourcées, à valider)`.

### Task 2: Moteur — climat, notes et choix des rotations

**Files:** Create `frontend/src/lib/moteur/{climat,notes,rotations}.ts` · Test `frontend/tests/unit/moteur.test.ts`

**Interfaces — Consumes:** `Culture`, `Climat`, `Parcelle`, `CRITERES`. **Produces:**
- `extraireClimat(c: Climat): { pluieSaisonMm: number; moisSaison: number; tmaxSaison: number; saison: { debut: number; fin: number }; annees: number }` — saison = `c.saisonPluies` ; pluie = somme des mois de cette saison.
- `notesRotation(seq: Culture[], cl: ClimatResume, eau: Parcelle["eau"]): Record<CritereId, 1|2|3|4|5>`.
- `scorePondere(notes, priorites: string[]): number` — poids 3 pour un critère choisi, 1 sinon (`PRIORITE_CRITERE` : « Rendre mon sol plus fertile »→fertilite, « Garder un bon revenu »→revenu, « Utiliser moins d'eau »→eau, « Résister aux sécheresses »→secheresse, « Nourrir mon bétail (fourrage) »→fourrage, « Limiter l'érosion de mon champ »→erosion, « Vendre facilement au marché local »→marche).
- `calculerRotations(p: Parcelle, climat: Climat, cultures: Culture[]): RotationCalculee[] | null` — 3 éléments `A` (actuelle), `B`, `C`, ou `null` si aucune culture.

Règles (exactes) :
- Eau d'une culture : `r = eauMm[1] / pluieSaisonMm` → r ≤ 0,5 : 5 ; ≤ 0,7 : 4 ; ≤ 0,9 : 3 ; ≤ 1,1 : 2 ; sinon 1. Irrigation : +1 (borné à 5). Rotation = moyenne arrondie.
- Sécheresse : moyenne arrondie de `secheresse` ; −1 si une culture a `eauMm[0] > pluieSaisonMm` (sans irrigation).
- Fertilité : 2 + nombre de légumineuses (max +2) + 1 si aucune famille répétée d'affilée ; bornée 1–5.
- Anti-érosion, fourrage, revenu, marché : moyenne arrondie du champ correspondant.
- Candidats : suites de 3 cultures distinctes, sans même famille d'affilée, avec au moins une légumineuse, différentes de l'actuelle ; triées par `scorePondere` décroissant puis ordre alphabétique ; matériel `daba` : −0,5 au score d'une suite contenant une culture `travailSol ≥ 4`. `B` = meilleure ; `C` = meilleure suite différant de `B` sur au moins 2 positions.
- Actuelle : les cultures saisies, dans l'ordre, 3 au plus (une seule = monoculture).

- [ ] **Step 1: Test** `moteur.test.ts` avec le climat réel de Korhogo (`data/regions/poro.json`) et `cultures.json` :
  - `extraireClimat` : saison = `saisonPluies`, `pluieSaisonMm` = somme des mois de la saison ;
  - culture avec `eauMm[1]` = 0,5 × pluie → eau 5 ; = 1,2 × pluie → eau 1 ; irrigation fait passer 1 à 2 ;
  - `calculerRotations` : A = cultures saisies ; B et C respectent les 3 contraintes ; B et C diffèrent d'au moins 2 positions ;
  - mettre seulement « Utiliser moins d'eau » en priorité donne une note d'eau de B ≥ celle obtenue avec seulement « Garder un bon revenu » ;
  - une seule culture → A de longueur 1 ; aucune culture → `null` ;
  - même entrée → même sortie (déterministe) ;
  - avec `daba`, B ne contient aucune culture `travailSol ≥ 4` quand une suite équivalente existe.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. **Step 5: Commit** `feat: moteur de score des rotations (règles écrites)`.

### Task 3: Moteur — explications, confiance, calendrier et sortie conforme

**Files:** Create `frontend/src/lib/moteur/explications.ts` · Modify `rotations.ts`, `contract/index.ts` (`Rotation.sequence` min 1) · Test `frontend/tests/unit/explications.test.ts`

**Interfaces — Produces:** `RotationCalculee` = `Rotation` (schéma existant), valide par `RotationSchema.parse`. Champs générés :
- `pourquoi` : une phrase par règle déclenchée (légumineuse : « {L} capte l'azote de l'air et le laisse dans le sol pour {suivante}. » ; alternance : « Alterner les familles de plantes freine ravageurs et maladies. » ; eau : « La saison des pluies apporte environ {X} mm : assez pour {cultures dont eauMm[1] ≤ X}. »).
- `risques` : « {c} risque de manquer d'eau : la saison apporte {X} mm pour un besoin d'au moins {eauMm[0]} mm. » ; chaleur (`tmaxSaison > 35` et `chaleur ≤ 2`) ; travail à la daba (`travailSol ≥ 4`).
- `lacune` : toujours « prix et demande au marché local non intégrés (revenu et marché estimés) » + « pas de mesure du sol de la parcelle » + « végétation (NDVI) pas encore branchée » si l'onglet `veg` est absent ; joints par « ; ».
- `confiance.facteurs` : accordSources 3 ; finesse 1 (maille NASA POWER ≈ 50 km) ; historique 5 si ≥ 20 ans, 4 si ≥ 10, sinon 2 ; verification 1 ; `niveau` : moyenne ≥ 3,5 « élevée », ≥ 2,5 « moyenne », sinon « faible ».
- `calendrier` : année i → culture `seq[i % len]` placée de `saison.debut` sur `ceil(cycleJours/30)` mois (bornés à décembre), `sol_nu` sur les autres mois.
- `donnees` : NASA POWER (pluie de la saison, période) + « Fiches cultures : FAO ECOCROP, à valider ».
- `tag` / `recommandee` : A « Actuelle » ; B « Recommandée » et `recommandee: true` si son score pondéré dépasse celui de A, sinon « Alternative » ; C « Alternative ».

- [ ] **Step 1: Test** : les 3 sorties passent `RotationSchema.parse` ; une rotation avec arachide a une phrase « capte l'azote » ; une culture dont le besoin minimal dépasse la pluie produit le risque d'eau ; la lacune NDVI apparaît sans onglet `veg` et disparaît avec ; calendrier : 3 années, chaque mois couvert une seule fois par année ; confiance `moyenne` pour 21 ans de données.
- [ ] **Steps 2–5** : FAIL → implement → PASS → commit `feat: explications, confiance et calendrier calculés`.

### Task 4: Brancher le moteur sur l'interface

**Files:** Create `frontend/src/lib/useClimatRegion.ts`, `lib/moteur/fiche-lien.ts`, `components/{RotationsVue,RotationDetail,FicheVue}.tsx` · Modify `ClimatVue.tsx` (utilise le hook), pages `rotations`, `rotations/[id]`, `fiche/[id]`, `tableau`, `methode`, `lib/ia/assistant.ts`, `app/api/ia/route.ts`, `components/AssistantIA.tsx` · Delete `data/pilot/korhogo/rotations.json`, `getRotations`, `getRotation` · Test `frontend/tests/unit/branchement.test.tsx` + e2e.

**Interfaces — Produces:**
- `useClimatRegion(initial: Climat): { etat: "chargement"|"pret"|"erreur"; climat: Climat | null }` (logique déplacée de `ClimatVue`).
- `lienFiche(id: "A"|"B"|"C", p: Parcelle): string` → `/fiche/{id}?r={region}&c={cultures,…}&p={indices de priorités}&e={eau}&m={materiel}` ; `lireLienFiche(params: URLSearchParams): Parcelle | null` (null si un paramètre manque ou est invalide).
- `DemandeSchema` devient `{ rotation: RotationSchema, region: string, question?: string }` ; la route charge le climat de `region`.

- [ ] **Step 1: Tests** : `lireLienFiche(new URLSearchParams(lienFiche("B", p).split("?")[1]))` redonne `p` (sans contour) ; un lien sans `r` → `null` ; `RotationsVue` (parcelle Korhogo, maïs + coton) affiche 3 cartes dont « Actuelle » ; changer les priorités change la séquence de B ; `FicheVue` avec un lien invalide affiche « Lien incomplet » et un lien vers `/` ; le climat qui échoue affiche le message de reprise ; l'assistant envoie la rotation calculée.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** ; `/methode` explique les 4 facteurs de confiance sans exemple chiffré. **Step 4: Run** unitaires + `npx playwright test --trace off` (mettre à jour les e2e qui supposaient Maïs → Arachide → Coton : vérifier la séquence affichée dans la carte B plutôt qu'un texte fixe) → PASS.
- [ ] **Step 5: Commit** `feat: rotations calculées pour chaque parcelle et région`.

### Task 5: Pipeline — climat complet réel par région

**Files:** Create `data/pipeline/{climat_complet.py,etat_du_moment.py,test_climat_complet.py,test_etat_du_moment.py}` · Modify `fetch_power.py` (paramètres `T2M_MAX,PRECTOTCORR,GWETROOT` ; `telecharger_jours(lat, lon, debut, fin)` pour l'API quotidienne), `build_regions.py` · Delete `data/pilot/korhogo/climat.json`, `build_climat.py` (remplacé) · Modify `frontend/src/lib/data` (`getClimat()` lit `data/regions/poro.json`), contrat (`grace` optionnel).

**Interfaces — Produces:**
- `climat_complet(brut_mensuel: dict, brut_jours: dict | None, region: dict, aujourd_hui: date) -> dict` conforme à `ClimatSchema` ; ne contient ni `grace` ni onglet `veg` ; `matrice` = Pluie, Chaleur, Humidité du sol (NASA POWER) ; indicateur 4 = « Sol le plus sec : {mois} » ; `meta.reel` = `["pluie", "chaleur", "humidité du sol"]`, sans `exempleDe`.
- `alertes(pluie12, chaleur12, sol12, saisons) -> list[dict]` : « Forte chaleur en {mois} » (surveiller) si max ≥ 38 °C ; « Sol très sec en {mois} » (surveiller) ; « Fenêtre humide : {mois} » (favorable) ; « Deux saisons des pluies » (favorable) si 2 saisons.
- `etat_du_moment(jours: dict, normales: dict, saisons, aujourd_hui) -> dict | None` : jours valides des 30 derniers ; `None` s'il en reste moins de 20 ; tuiles Pluie (30 j), Chaleur, Humidité du sol, avec `niveau` « alerte » si pluie < 50 % de la normale ou chaleur > normale + 2 °C ; titre « Saison sèche » / « Saison des pluies », texte avec la période « du {j1} au {j2} ».

- [ ] **Step 1: Tests** Python : alertes sur des séries synthétiques (chaleur 39 → alerte, 2 saisons → favorable) ; `etat_du_moment` ignore `-999` et renvoie `None` avec 19 jours valides ; `climat_complet` sur les bruts de Korhogo passe les clés du contrat et n'a pas `grace`.
- [ ] **Step 2: Run** `python3 -m unittest` → FAIL. **Step 3: Implement**, puis `python3 build_regions.py --rafraichir` (33 régions, mensuel + 45 derniers jours). **Step 4: Run** Python + `npx vitest run` (contrat sur les 33 fichiers) → PASS.
- [ ] **Step 5: Commit** `feat: climat entièrement réel par région (humidité du sol, alertes, état du moment)`.

### Task 6: Plus aucune démonstration à l'écran

**Files:** Modify `ClimatVue.tsx` (bloc GRACE masqué sans `grace`, note des sources, plus de « valeurs d'exemple »), `Tableau.tsx` (frise NDVI masquée sans onglet `veg`, date de l'état du moment, tuiles masquées si `actuel` absent), `ClimatTabs.tsx`, `app/conseiller/page.tsx` (écran vide), `NoteRegion.tsx` (supprimé), README, `docs/contrat-donnees.md` · Test `frontend/tests/unit/sans-demo.test.ts`

- [ ] **Step 1: Test** : aucun fichier de `frontend/src` ni de `data/regions` ne contient « valeurs d'exemple », « [exemple] », « exemple Korhogo » ; `ClimatVue` sans `grace` n'affiche pas « L'eau stockée » ; la page conseiller affiche « Aucun agriculteur suivi pour l'instant ».
- [ ] **Steps 2–5** : FAIL → implement → PASS (unitaires + e2e) → commit `feat: suppression des données de démonstration`.

### Task 7: Mode app du site et pont natif

**Files:** Create `frontend/src/lib/modeApp.ts`, `components/ModeApp.tsx` · Modify `layout.tsx`, `globals.css` (`.mode-app .no-app { display: none }`), `SiteHeader`, `BottomNav` (classe `no-app`), `CarteParcelle` (« Ma position »), `ShareActions` · Test `frontend/tests/unit/modeApp.test.tsx` + e2e.

**Interfaces — Produces:** `estModeApp(): boolean` (vrai si `?app=1` vu dans la session, gardé en `sessionStorage` sous `forosat.app`) ; `envoyerAuNatif(msg: { type: "position" } | { type: "partager"; url: string; texte: string }): boolean` (vrai si `window.ReactNativeWebView` existe) ; écoute `message` `{ type: "position"; lat: number; lon: number }` → la carte s'y rend.

- [ ] **Step 1: Tests** : avec `?app=1`, `<html>` porte `mode-app` et l'en-tête et la barre du bas sont masqués (e2e) ; sans pont natif, `envoyerAuNatif` renvoie `false` et le navigateur garde son comportement ; avec un faux `ReactNativeWebView`, « Ma position » envoie `{type:"position"}` et un message `{type:"position",lat,lon}` recentre la carte.
- [ ] **Steps 2–5** : FAIL → implement → PASS → commit `feat: mode app (?app=1) et pont vers l'app native`.

### Task 8: App Expo

**Files:** Create `mobile/` (`app.json`, `eas.json`, `package.json`, `app/_layout.tsx`, `app/index.tsx` écran d'entrée, `app/(onglets)/_layout.tsx`, `app/(onglets)/{tableau,climat,rotations,champ}.tsx`, `components/PageWeb.tsx`, `lib/config.ts`, `assets/icon.png`, `assets/adaptive-icon.png`) · Test `mobile/lib/__tests__` n'est pas requis ; vérification par types et export.

**Interfaces — Produces:** `PageWeb({ chemin }: { chemin: string })` — WebView de `${WEB_URL}${chemin}?app=1` ; `onMessage` : `position` → `expo-location` (permission demandée) puis `postMessage({type:"position",lat,lon})` ; `partager` → `Share.share({ message: texte + "\n" + url })` ; erreur de chargement → écran « Pas de connexion » + bouton « Réessayer ». `WEB_URL` = `process.env.EXPO_PUBLIC_WEB_URL`. `app.json` : nom « ForoSat », slug `forosat`, Android `package: "ci.bemtech.forosat"`, permission localisation avec texte français. `eas.json` : `preview` (APK, `distribution: internal`), `production`.

- [ ] **Step 1:** Créer le projet avec `npx create-expo-app@latest mobile --template tabs` puis remplacer les écrans ; icônes rendues depuis le logo SVG (capture Playwright 1024 px).
- [ ] **Step 2: Verify** `cd mobile && npx tsc --noEmit` → aucune erreur ; `npx expo export --platform android` → bundle produit sans erreur.
- [ ] **Step 3: Commit** `feat: app mobile Expo (coque native + pages ForoSat)`.

### Task 9: Build EAS (dépend du jeton Expo et de l'URL Vercel)

- [ ] Demander le jeton Expo par le formulaire sécurisé (hôte `api.expo.dev`) et l'URL Vercel à l'utilisateur.
- [ ] `cd mobile && EXPO_PUBLIC_WEB_URL=<url> npx eas-cli init --non-interactive` puis `npx eas-cli build --platform android --profile preview --non-interactive --no-wait` ; relever le lien du build.
- [ ] Commit de `app.json` (projectId) : `chore: projet EAS lié`.

### Task 10: NDVI et GRACE (dépend du jeton Earthdata)

- [ ] Demander le jeton Earthdata par le formulaire sécurisé (hôte `appeears.earthdatacloud.nasa.gov`).
- [ ] Pipeline : NDVI MOD13Q1 par point (AppEEARS) → climatologie mensuelle → onglet `veg`, ligne « Végétation », indicateur « Sol nu : n mois » (NDVI < 0,3) ; GRACE → série `grace` avec lacunes `null`. Tests Python sur séries synthétiques.
- [ ] Les blocs réapparaissent automatiquement (Tasks 3 et 6) ; commit `feat: végétation et eau stockée réelles (Earthdata)`.

---

## Self-Review
- Couverture : A (Tasks 1–4), B (5, 6, 10), C (7–9) ; conseiller vide (6) ; assistant branché sur la rotation calculée (4).
- Types : `Culture`, `RotationCalculee` = `Rotation`, `extraireClimat`, `calculerRotations`, `lienFiche/lireLienFiche`, `useClimatRegion`, `estModeApp/envoyerAuNatif`, `PageWeb` utilisés sous ces noms partout.
- Dépendances externes isolées dans les Tasks 9 et 10 ; le reste ne les attend pas.
