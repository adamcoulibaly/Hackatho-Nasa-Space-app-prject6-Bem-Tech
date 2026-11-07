# ForoSat — Socle et interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer le socle du dépôt et l'interface Next.js de ForoSat (parcours Parcelle → Climat → Rotations → Détail → Fiche) alimentée par des JSON d'exemple de Korhogo.

**Architecture:** Monorepo. `frontend/` (Next.js App Router) lit les données uniquement via `src/lib/data`, qui charge `data/pilot/korhogo/*.json` validés par des schémas zod (le contrat). L'état de la parcelle vit dans un contexte client sauvegardé en local.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 3, zod, Leaflet, Vitest + Testing Library, Playwright. Node 22.

**Spec:** `docs/superpowers/specs/2026-11-07-socle-interface-design.md`

## Global Constraints

- Interface entièrement en français.
- Palette : noir `#07120D`, fond `#F4F6F1`, orange `#F77F00`, vert `#009E60` et `#00703C`, texte secondaire `#4A5A51`, blanc `#FFFFFF`, bordure `#C9D3CD`.
- Polices : Unbounded (titres), Inter Tight (texte), Instrument Serif italique (accents).
- Boutons, liens et champs : vrais `button`/`a`/`input` avec libellé visible ou `aria-label`; cibles d'au moins 44 px.
- Les écrans ne lisent jamais un fichier de données directement : tout passe par `src/lib/data`.
- Les lacunes et la confiance sont des champs du contrat, jamais calculés à l'affichage.
- Valeurs issues des maquettes marquées « valeurs d'exemple » dans l'interface.
- 7 critères de score, échelle 1 à 5 : Fertilité du sol, Économie d'eau, Sécheresse, Revenu, Anti-érosion, Fourrage, Marché local. Libellés : 1-2 Faible, 3 Moyen, 4 Bon, 5 Très bon.
- Commits au nom de l'utilisateur (identité git du dépôt), sans mention de Claude. Aucun push sans instruction.

## Review Focus

- Parcelle vide (aucune culture cochée, surface 0 ou négative) : le formulaire bloque « Analyser » avec un message clair.
- Accès direct à `/climat` ou `/rotations` sans parcelle saisie : écran de reprise vers l'étape 1, pas de page vide.
- Rotation inconnue (`/rotations/Z`, `/fiche/Z`) : page « introuvable » en français.
- Série GRACE avec trou 2017–2018 : le trou s'affiche comme lacune, jamais comme zéro.
- Données JSON corrompues ou absentes : message d'erreur lisible, pas d'écran blanc.
- `localStorage` indisponible ou contenu corrompu : l'app démarre avec les valeurs par défaut.

---

## File Structure

```
frontend/
  package.json, next.config.ts, tsconfig.json, tailwind.config.ts, postcss.config.mjs
  vitest.config.ts, playwright.config.ts
  src/app/layout.tsx, globals.css
  src/app/page.tsx                       accueil
  src/app/parcelle/page.tsx              étape 1
  src/app/climat/page.tsx                étape 2
  src/app/rotations/page.tsx             étape 3
  src/app/rotations/[id]/page.tsx        détail
  src/app/methode/page.tsx, lexique/page.tsx, conseiller/page.tsx
  src/app/fiche/[id]/page.tsx            fiche imprimable
  src/lib/contract/*.ts                  schémas zod + types
  src/lib/data/index.ts                  accès aux données
  src/lib/parcelle/context.tsx           état de la parcelle
  src/lib/format.ts                      fonctions d'affichage
  src/components/*                       en-tête, jauges, cartes, graphiques
  tests/unit/*.test.ts(x), tests/e2e/parcours.spec.ts
data/pilot/korhogo/{climat,rotations,couches,sources,lexique}.json
backend/README.md, knowledge/README.md
```

Les JSON de données sont servis depuis `data/` ; `src/lib/data` les lit côté serveur (`fs`) dans les composants serveur. Aucun JSON n'est dupliqué dans `frontend/`.

---

### Task 1: Squelette Next.js, thème et en-tête

**Files:**
- Create: `frontend/` (projet Next.js, config Tailwind, Vitest), `frontend/src/app/layout.tsx`, `frontend/src/app/globals.css`, `frontend/src/components/SiteHeader.tsx`, `frontend/src/components/Logo.tsx`, `backend/README.md`, `knowledge/README.md`, `.gitignore`
- Test: `frontend/tests/unit/SiteHeader.test.tsx`

**Interfaces:**
- Produces: `SiteHeader({ current?: "parcelle"|"climat"|"rotations"|"lexique"; badge?: string })`, `Logo()`, thème Tailwind avec couleurs `ink`, `paper`, `orange`, `green`, `green-dark`, `muted`, `line` et polices `font-display`, `font-sans`, `font-serif`.

- [ ] **Step 1: Créer le projet** — `npx create-next-app@15 frontend --ts --tailwind --app --src-dir --no-eslint --import-alias "@/*"`, puis `npm i zod leaflet` et `npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @types/leaflet @playwright/test`. Ajouter les scripts `test` (`vitest run`) et `test:e2e` (`playwright test`). Ajouter `node_modules`, `.next`, `test-results` au `.gitignore` racine.
- [ ] **Step 2: Write the failing test** `SiteHeader.test.tsx` : `render(<SiteHeader current="climat" badge="Korhogo · 2 ha" />)` ; assertions : lien « 2 · Climat » a `aria-current="page"`, lien « 1 · Parcelle » n'a pas `aria-current`, le texte « Korhogo · 2 ha » est présent, le lien du logo pointe vers `/`.
- [ ] **Step 3: Run test to verify it fails** — `cd frontend && npx vitest run tests/unit/SiteHeader.test.tsx` ; attendu : FAIL (module absent).
- [ ] **Step 4: Implement** le thème (couleurs et polices Google via `next/font` : Unbounded, Inter Tight, Instrument Serif), `Logo` (SVG de la maquette : disque orange/vert avec orbite), `SiteHeader` (fond `ink`, nav « 1 · Parcelle », « 2 · Climat », « 3 · Rotations », « Lexique »), `layout.tsx` (lang `fr`, fond `paper`) ; créer `backend/README.md` et `knowledge/README.md` décrivant ce que doivent livrer les membres 3 (API : score, confiance, lacunes) et 2 (fiches des 8 cultures).
- [ ] **Step 5: Run test to verify it passes** — même commande ; attendu : PASS. Puis `npm run build` ; attendu : succès.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: squelette Next.js, thème ForoSat et en-tête"`

---

### Task 2: Contrat de données et jeux d'exemple

**Files:**
- Create: `frontend/src/lib/contract/{climat,rotations,couches,sources,lexique}.ts`, `frontend/src/lib/contract/index.ts`, `data/pilot/korhogo/{climat,rotations,couches,sources,lexique}.json`, `docs/contrat-donnees.md`
- Test: `frontend/tests/unit/contract.test.ts`

**Interfaces:**
- Produces (schémas zod et types déduits, exportés de `@/lib/contract`) :
  - `ClimatSchema` / `Climat` : `{ indicateurs: {label, valeur, source}[4], pluieMensuelle: number[12], saisonPluies: {debut: number, fin: number}, matrice: {label, source, niveau: ("eau"|"chaud"|"veg"), valeurs: number[12]}[], grace: {annee: number, ecart: number|null}[], alertes: {type: "surveiller"|"favorable", titre, texte}[] }`
  - `RotationSchema` / `Rotation` : `{ id: "A"|"B"|"C", tag, sequence: string[], scores: Record<CritereId, 1|2|3|4|5>, note, pourquoi, lacune, confiance: {niveau: "faible"|"moyenne"|"élevée", facteurs: {accordSources, finesse, historique, verification}}, calendrier: {culture, debutMois, finMois, annee: 1|2|3}[], sources: string[] }`
  - `CritereId` = `"fertilite"|"eau"|"secheresse"|"revenu"|"erosion"|"fourrage"|"marche"`.
  - `CouchesSchema`, `SourcesSchema` (8 sources + 4 approches IA), `LexiqueSchema` (`{terme, definition}[]`).

- [ ] **Step 1: Write the failing test** `contract.test.ts` : lit chaque JSON de `data/pilot/korhogo/` avec `fs` et le parse. Assertions : `climat.pluieMensuelle` vaut `[5,15,40,80,120,150,190,260,200,90,20,5]` ; `climat.grace` contient exactement deux entrées `ecart: null` (années 2017 et 2018) ; `rotations` contient A, B, C avec séquences `["Maïs","Coton"]`, `["Maïs","Arachide","Coton"]`, `["Sorgho","Niébé","Maïs"]` ; scores de B = `{fertilite:4, eau:3, secheresse:3, revenu:4, erosion:3, fourrage:4, marche:4}` ; chaque rotation a une `lacune` non vide ; `sources` contient 8 sources et 4 approches ; `lexique` contient 14 termes. Test négatif : un score de 6 est rejeté par `RotationSchema`.
- [ ] **Step 2: Run test to verify it fails** — `npx vitest run tests/unit/contract.test.ts` ; attendu : FAIL.
- [ ] **Step 3: Implement** les schémas et remplir les JSON avec les valeurs des maquettes (Web 2, 3, 4, 5, 7). Scores de A : `[2,3,3,4,2,3,4]`, de C : `[4,5,5,3,4,5,3]` dans l'ordre des critères ci-dessus. Textes (`note`, `lacune`, confiance) repris de la maquette Web 3 ; confiance A élevée, B et C moyenne. Les 14 termes du lexique sont lus dans la maquette `Web-Lexique` (artifact « ForoSat – Maquettes »). Documenter dans `docs/contrat-donnees.md` chaque fichier et champ pour les équipes données et IA.
- [ ] **Step 4: Run test to verify it passes** — attendu : PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: contrat de données et jeux d'exemple Korhogo"`

---

### Task 3: Couche d'accès aux données et fonctions d'affichage

**Files:**
- Create: `frontend/src/lib/data/index.ts`, `frontend/src/lib/format.ts`
- Test: `frontend/tests/unit/data.test.ts`, `frontend/tests/unit/format.test.ts`

**Interfaces:**
- Consumes: schémas de Task 2.
- Produces :
  - `getClimat(): Promise<Climat>`, `getRotations(): Promise<Rotation[]>`, `getRotation(id: string): Promise<Rotation | null>`, `getCouches()`, `getSources()`, `getLexique()`. Chaque fonction lit `data/pilot/korhogo/<fichier>.json` (chemin de base surchargeable par `FOROSAT_DATA_DIR`), valide avec zod et lance `DataError` (message français + `cause`) si le fichier est absent ou invalide.
  - `scoreWord(level: number): "Faible"|"Moyen"|"Bon"|"Très bon"`, `scoreSegments(level: number, dark: boolean): string[]` (5 couleurs), `barHeight(value: number, max: number, px: number): number` (minimum 4), `graceBar(entry): {up: number, down: number, gap: boolean}`.

- [ ] **Step 1: Write the failing tests** — `format.test.ts` : `scoreWord(1)` et `scoreWord(2)` = « Faible », 3 = « Moyen », 4 = « Bon », 5 = « Très bon » ; `scoreSegments(4,false)` a 4 `#00703C` puis 1 `#DDE3DC` ; `scoreSegments(3,false)` remplit en `#F77F00` ; `barHeight(5,260,170)` = 4 ; `barHeight(260,260,170)` = 170 ; `graceBar({annee:2017, ecart:null}).gap` est vrai et `up`/`down` valent 0 (jamais un zéro affiché comme valeur). `data.test.ts` : `getRotation("B")` renvoie la rotation B ; `getRotation("Z")` renvoie `null` ; avec `FOROSAT_DATA_DIR` pointant un dossier vide, `getClimat()` rejette une `DataError` dont le message est en français ; avec un JSON invalide (score 9), `getRotations()` rejette `DataError`.
- [ ] **Step 2: Run tests to verify they fail** — attendu : FAIL.
- [ ] **Step 3: Implement** les deux modules selon les signatures. Le chemin par défaut remonte de `frontend/` vers `../data/pilot/korhogo`.
- [ ] **Step 4: Run tests to verify they pass** — attendu : PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: accès aux données et fonctions d'affichage"`

---

### Task 4: État de la parcelle

**Files:**
- Create: `frontend/src/lib/parcelle/context.tsx`, `frontend/src/lib/parcelle/validate.ts`
- Modify: `frontend/src/app/layout.tsx` (envelopper dans `ParcelleProvider`)
- Test: `frontend/tests/unit/parcelle.test.tsx`

**Interfaces:**
- Produces :
  - Type `Parcelle = { region: "Poro (Korhogo)"|"Gbêkê (Bouaké)"; surface: number; cultures: string[]; eau: "pluie"|"irrigation"; priorites: string[]; materiel: "daba"|"traction"|"tracteur" }`.
  - `DEFAULT_PARCELLE` : surface 2, cultures `["Maïs","Coton"]`, eau `pluie`, priorités `["Rendre mon sol plus fertile","Garder un bon revenu","Nourrir mon bétail (fourrage)"]`, matériel `traction`.
  - `validateParcelle(p: Parcelle): { ok: boolean; erreurs: string[] }` — erreurs en français : surface ≤ 0 ou non numérique, aucune culture, aucune priorité.
  - `ParcelleProvider`, `useParcelle(): { parcelle: Parcelle; setParcelle(p: Partial<Parcelle>): void; saisie: boolean; marquerSaisie(): void }`. Sauvegarde dans `localStorage` clé `forosat.parcelle` ; lecture protégée par try/catch.

- [ ] **Step 1: Write the failing test** : `validateParcelle` rejette surface 0, surface -3, `NaN`, cultures vides, priorités vides, avec les messages « La surface doit être supérieure à 0. », « Choisissez au moins une culture. », « Choisissez au moins une priorité. » ; accepte `DEFAULT_PARCELLE`. Provider : un `localStorage` contenant `"{corrompu"` donne `DEFAULT_PARCELLE` sans exception ; `setParcelle({surface: 5})` écrit la valeur dans `localStorage` ; `saisie` est faux au départ et vrai après `marquerSaisie()`.
- [ ] **Step 2: Run test to verify it fails** — attendu : FAIL.
- [ ] **Step 3: Implement** selon les signatures (état React + effet de lecture au montage, pour éviter l'erreur d'hydratation).
- [ ] **Step 4: Run test to verify it passes** — attendu : PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: état et validation de la parcelle"`

---

### Task 5: Étape 1 — Ma parcelle

**Files:**
- Create: `frontend/src/app/parcelle/page.tsx`, `frontend/src/components/ParcelleForm.tsx`, `frontend/src/components/LayerMap.tsx`, `frontend/src/lib/mosaic.ts`
- Test: `frontend/tests/unit/ParcelleForm.test.tsx`, `frontend/tests/unit/mosaic.test.ts`

**Interfaces:**
- Consumes: `useParcelle`, `validateParcelle` (Task 4), `getCouches()` (Task 3).
- Produces : `mosaic(layer: CoucheId, year: number): string[]` (720 couleurs, 36×20, déterministe, reprend l'algorithme de la maquette Web-Parcelle) ; `LayerMap({ couches })` : mosaïque, cadre « Ma parcelle · 2 ha », 4 boutons de couche (`aria-pressed`), curseur d'année 2005–2025 étiqueté, légende ; `ParcelleForm({ onSubmit })`.

- [ ] **Step 1: Write the failing tests** — `mosaic.test.ts` : longueur 720 ; deux appels identiques donnent le même résultat ; changer d'année change le résultat. `ParcelleForm.test.tsx` : décocher toutes les cultures puis cliquer « Analyser ma parcelle » n'appelle pas `onSubmit` et affiche « Choisissez au moins une culture. » ; surface `0` affiche « La surface doit être supérieure à 0. » ; formulaire valide appelle `onSubmit` une fois.
- [ ] **Step 2: Run tests to verify they fail** — attendu : FAIL.
- [ ] **Step 3: Implement** la page selon la maquette Web-Parcelle : carte à gauche, formulaire à droite (région, surface, 8 cultures en boutons bascule, accès à l'eau en radios, 7 priorités en cases, matériel). Leaflet est chargé dynamiquement (`next/dynamic`, `ssr:false`) uniquement pour la recherche de localité future : pour ce chantier, la carte reste la mosaïque. Au succès : `marquerSaisie()` puis navigation vers `/climat`.
- [ ] **Step 4: Run tests to verify they pass** — attendu : PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: étape 1 — ma parcelle"`

---

### Task 6: Étape 2 — Profil climatique

**Files:**
- Create: `frontend/src/app/climat/page.tsx`, `frontend/src/components/{RainChart,YearMatrix,GraceChart,AlertCard,NeedParcelle}.tsx`
- Test: `frontend/tests/unit/climat.test.tsx`

**Interfaces:**
- Consumes: `getClimat()`, `barHeight`, `graceBar` (Task 3), `useParcelle` (Task 4).
- Produces : `NeedParcelle()` — écran de reprise (« Commencez par situer votre champ » + lien vers `/parcelle`), affiché par `/climat` et `/rotations` quand `saisie` est faux ; `GraceChart({ data })` ; `RainChart({ mois, saison })` ; `YearMatrix({ lignes })` ; `AlertCard({ type, titre, texte })`.

- [ ] **Step 1: Write the failing tests** : `GraceChart` rend 21 colonnes ; les colonnes 2017 et 2018 portent `data-gap="true"` et le texte alternatif « Pas de mesure » ; la légende contient « Pas de mesure ». `RainChart` marque en vert les mois 5 à 10 (indices 4 à 9). Page sans parcelle saisie rend `NeedParcelle`.
- [ ] **Step 2: Run tests to verify they fail** — attendu : FAIL.
- [ ] **Step 3: Implement** la page selon Web-Climat : 4 indicateurs, pluie mois par mois, matrice annuelle (conteneur défilant sur petit écran), GRACE avec lacune hachurée et paragraphe explicatif, 3 alertes. Étiquette « valeurs d'exemple » dans le surtitre.
- [ ] **Step 4: Run tests to verify they pass** — attendu : PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: étape 2 — profil climatique"`

---

### Task 7: Étape 3 et détail — Rotations

**Files:**
- Create: `frontend/src/app/rotations/page.tsx`, `frontend/src/app/rotations/[id]/page.tsx`, `frontend/src/app/rotations/[id]/not-found.tsx`, `frontend/src/components/{RotationCard,ScoreBar,CalendrierTrois,RainSimulator}.tsx`, `frontend/src/lib/simulateur.ts`
- Test: `frontend/tests/unit/rotations.test.tsx`, `frontend/tests/unit/simulateur.test.ts`

**Interfaces:**
- Consumes: `getRotations`, `getRotation`, `scoreWord`, `scoreSegments` (Task 3), `useParcelle`, `NeedParcelle`.
- Produces : `RotationCard({ rotation, dark })` ; `ScoreBar({ label, level, dark })` ; `CalendrierTrois({ calendrier })` — frise de 3 ans × 12 mois avec les mois de sol nu ; `simulate(rotation: Rotation, deltaPluiePct: number, deltaChaleurC: number): { secheresse: number; eau: number }` — réduit les niveaux de sécheresse et d'eau de 1 par tranche de 15 % de pluie en moins ou de 2 °C en plus, borné à 1–5, sans modifier la rotation d'origine.

- [ ] **Step 1: Write the failing tests** — `simulate(B, 0, 0)` renvoie `{secheresse:3, eau:3}` ; `simulate(B, -30, 0)` renvoie `{secheresse:1, eau:1}` ; `simulate(C, -15, 0)` renvoie `{secheresse:4, eau:4}` ; jamais sous 1 ni au-dessus de 5 ; l'objet `B` n'est pas modifié. `rotations.test.tsx` : `RotationCard` de B affiche « Recommandée », la séquence « Maïs → Arachide → Coton », 7 jauges, la ligne « Lacune : » et « Confiance : moyenne » ; la page détail de `Z` appelle `notFound()`.
- [ ] **Step 2: Run tests to verify they fail** — attendu : FAIL.
- [ ] **Step 3: Implement** : `/rotations` selon Web-Comparer (3 cartes, B en fond noir, encadré « Pourquoi la rotation B ressort ? » et « À vérifier avant de décider », rappel des priorités choisies depuis `useParcelle`) ; `/rotations/[id]` selon Web-Rotation (calendrier sur 3 ans, pourquoi, sources, confiance en 4 facteurs, simulateur « Et si… ? » avec deux curseurs, bouton « Partager la fiche » vers `/fiche/[id]`, mention « là où l'humain décide »). `generateStaticParams` renvoie A, B, C.
- [ ] **Step 4: Run tests to verify they pass** — attendu : PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: étape 3 et détail des rotations"`

---

### Task 8: Fiche partageable

**Files:**
- Create: `frontend/src/app/fiche/[id]/page.tsx`, `frontend/src/components/{Fiche,PrintButton}.tsx`, `frontend/src/lib/whatsapp.ts`
- Test: `frontend/tests/unit/fiche.test.tsx`, `frontend/tests/unit/whatsapp.test.ts`

**Interfaces:**
- Consumes: `getRotation`, `Rotation`.
- Produces : `whatsappUrl(rotation: Rotation, origin: string): string` → `https://wa.me/?text=<texte encodé>` ; le texte contient la séquence, la note, la lacune, la confiance et le lien `${origin}/fiche/${id}` ; `Fiche({ rotation })` (quoi semer, quand, pourquoi, à quoi faire attention, mention « ne remplace pas l'avis d'un conseiller agricole ») ; `PrintButton` appelle `window.print()`. `@media print` masque l'en-tête et les boutons.

- [ ] **Step 1: Write the failing tests** : `whatsappUrl(B, "https://x.test")` commence par `https://wa.me/?text=`, décodé contient « Maïs → Arachide → Coton », la lacune de B et `https://x.test/fiche/B`. `Fiche` affiche la mention de l'avis du conseiller et la ligne de confiance.
- [ ] **Step 2: Run tests to verify they fail** — attendu : FAIL.
- [ ] **Step 3: Implement** selon la maquette « Fiche WhatsApp », en pleine largeur mobile (max 540 px), avec boutons « Envoyer sur WhatsApp » et « Imprimer / PDF ».
- [ ] **Step 4: Run tests to verify they pass** — attendu : PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: fiche partageable WhatsApp et impression"`

---

### Task 9: Accueil, Méthode, Lexique, Conseiller

**Files:**
- Create: `frontend/src/app/{page,methode/page,lexique/page,conseiller/page}.tsx`, `frontend/src/components/{LexiqueSearch,ConfianceBreakdown}.tsx`, `frontend/src/lib/lexique.ts`
- Test: `frontend/tests/unit/lexique.test.ts`

**Interfaces:**
- Consumes: `getSources`, `getLexique`, `getRotations`.
- Produces : `filterLexique(termes: Terme[], query: string): Terme[]` — insensible à la casse et aux accents, vide → tous les termes ; `LexiqueSearch({ termes })` ; `ConfianceBreakdown({ facteurs })`.

- [ ] **Step 1: Write the failing test** : `filterLexique` avec « evapo » trouve « Évapotranspiration » ; avec « HUMIDITE » trouve « Humidité du sol » ; avec « zzz » renvoie `[]` ; avec `""` renvoie les 14 termes.
- [ ] **Step 2: Run test to verify it fails** — attendu : FAIL.
- [ ] **Step 3: Implement** : accueil (problème, place de ForoSat, public, bouton « Commencer » vers `/parcelle`) selon Web-Accueil ; méthode (8 sources sur grille commune, 4 approches IA comparées, confiance en 4 facteurs, encadré « Là où l'humain décide ») selon Web-Methode ; lexique avec recherche ; conseiller en lecture seule avec bandeau « Vision — après le hackathon ». Contenu textuel repris des maquettes et du cadrage, sans texte inventé.
- [ ] **Step 4: Run test to verify it passes** — attendu : PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: accueil, méthode, lexique et espace conseiller"`

---

### Task 10: Responsive, erreurs et parcours de bout en bout

**Files:**
- Create: `frontend/src/app/error.tsx`, `frontend/src/app/not-found.tsx`, `frontend/playwright.config.ts`, `frontend/tests/e2e/parcours.spec.ts`
- Modify: pages concernées pour la navigation mobile (en-tête qui se replie, tableaux défilants)

**Interfaces:**
- Consumes: toutes les routes ci-dessus.
- Produces : `error.tsx` (message « Impossible de charger les données. Rechargez la page. », bouton « Recharger »), `not-found.tsx` (« Page introuvable » + lien vers l'accueil).

- [ ] **Step 1: Write the failing e2e** `parcours.spec.ts`, deux projets Playwright (1280×800 et iPhone 12 sans `deviceScaleFactor`) : (a) `/parcelle` → cliquer « Analyser ma parcelle » → URL `/climat` → lien « Voir les 3 rotations » → `/rotations` → « Voir le détail » de la rotation B → `/rotations/B` → « Partager la fiche » → `/fiche/B` visible avec « Maïs → Arachide → Coton » ; (b) `/climat` ouvert directement dans un contexte neuf affiche « Commencez par situer votre champ » ; (c) `/rotations/Z` affiche « Page introuvable » ; (d) aucune page n'a de défilement horizontal de la page entière (`scrollWidth <= innerWidth`) en 390 px.
- [ ] **Step 2: Run e2e to verify it fails** — `npx playwright test --trace off` (le serveur se lance via `webServer: npm run build && npm start`) ; attendu : FAIL sur au moins (d) ou (c).
- [ ] **Step 3: Implement** `error.tsx` et `not-found.tsx`, corriger les débordements mobiles (en-tête replié, grilles `auto-fit`, graphiques dans un conteneur `overflow-x-auto`).
- [ ] **Step 4: Run all tests** — `npm test && npx playwright test --trace off && npm run build` ; attendu : tout passe.
- [ ] **Step 5: Commit** — `git commit -m "feat: gestion d'erreurs, responsive et test de parcours"`

---

### Task 11: Documentation d'équipe

**Files:**
- Modify: `README.md`
- Create: `docs/contrat-donnees.md` (complété si besoin)

- [ ] **Step 1: Rédiger** le README : objectif de ForoSat, structure du dépôt, commandes (`cd frontend && npm i && npm run dev`, `npm test`, `npx playwright test`), règle « une branche par membre, un push par jour », où brancher les données réelles (`data/pilot/korhogo/`, `FOROSAT_DATA_DIR`) et l'API (`NEXT_PUBLIC_API_URL`, futur).
- [ ] **Step 2: Vérifier** que chaque commande du README s'exécute telle qu'écrite depuis un clone propre (`npm ci` puis `npm test`) ; attendu : succès.
- [ ] **Step 3: Commit** — `git commit -m "docs: README et guide du contrat de données"`

---

## Self-Review

- **Couverture de la spec :** structure du dépôt (T1), contrat et JSON (T2), couche de données (T3), état de la parcelle (T4), routes Parcelle (T5), Climat (T6), Rotations/Détail (T7), Fiche (T8), Accueil/Méthode/Lexique/Conseiller (T9), erreurs, responsive et e2e (T10), documentation (T11).
- **Cohérence des types :** `Rotation`, `CritereId`, `Parcelle`, `scoreWord`, `scoreSegments`, `barHeight`, `graceBar`, `NeedParcelle` sont définis dans la tâche qui les produit et consommés sous le même nom ensuite.
- **Écart connu :** le point « carte Leaflet » du cadrage est reporté (mosaïque simulée), conformément à la spec.
