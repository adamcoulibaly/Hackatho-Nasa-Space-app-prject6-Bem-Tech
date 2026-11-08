# ForoSat — Fonctions ambitieuses (chantier 3)

Date : 2026-11-08 · Rendu : 14 novembre 2026

## Objectif
Donner au jury ce qu'aucun outil existant ne fait (AgroSat CI suit la végétation, aClimateWorld conseille des dates de semis, Ignitia envoie la météo par SMS) : **le passé prouve, le futur prévient, le téléphone alerte, le satellite et la photo se confrontent.**

**Réussite :** pour n'importe quelle région, chaque rotation montre ses 20 saisons réelles rejouées et sa tenue vers 2050 ; l'app Android alerte quand semer et compare une photo du champ à la vue NASA. Tout reste sourcé, honnête sur ses limites, et testé.

## Décisions prises avec l'utilisateur
1. Les quatre blocs, dans l'ordre : **rejeu 20 saisons → 2050 → alerte semis → photo + satellite**. Chaque bloc est livré complet (testé, poussé sur `main`) avant le suivant ; si le temps manque, on s'arrête après un bloc terminé.
2. 2050 : NASA NEX-GDDP-CMIP6, 3 modèles, 2 scénarios, méthode des écarts.
3. Alerte : **vérification par le téléphone** (tâche de fond + notification locale), sans Firebase ni base de données.
4. Photo : modèle de vision gratuit via OpenRouter, photo jamais enregistrée.

## Bloc 1 — Moteur de saison et rejeu 20 saisons
**Données.** `data/pipeline/fetch_power.py` télécharge en une requête par région la série **journalière 2005-01-01 → 2025-12-31** (PRECTOTCORR, T2M_MAX, T2M_MIN) de NASA POWER pour les 33 régions. Un nouveau script `build_saisons.py` en tire `data/saisons/<region>.json` : `{ meta, jours: { debut: "2005-01-01", pluie: number[], tmax: number[], tmin: number[] } }` (valeurs arrondies au dixième, `null` si manquante), lu par la couche `lib/data` comme le climat.

**Moteur** (`frontend/src/lib/moteur/saison/`, TypeScript pur) :
- `semis.ts` — date de semis (règle de Sivakumar) : premier jour, à partir du début de la saison des pluies de la région, où le cumul sur 3 jours atteint 20 mm sans période de 7 jours secs (< 1 mm/j) dans les 20 jours suivants. Aucun semis trouvé dans la fenêtre de la saison → « pas de semis possible » (saison perdue).
- `bilan.ts` — bilan d'eau journalier :
  - ET0 de Hargreaves (Tmax, Tmin, rayonnement extraterrestre calculé à partir de la latitude et du jour) ;
  - coefficient cultural FAO-56 par stade (initial, développement, mi-saison, fin), durées des stades ajoutées à `knowledge/cultures.json` (source FAO-56, tableaux 11 et 12, marquées « à valider par l'agronome ») ;
  - réservoir de 100 mm d'eau utile (**hypothèse affichée** : pas de mesure du sol de la parcelle), stress dès que le réservoir passe sous la moitié ;
  - sortie par saison : date de semis, rapport eau reçue / eau demandée sur le cycle et pendant la floraison, plus longue poche sèche pendant le cycle.
- `verdict.ts` — par saison : rapport global (avec un poids double sur la floraison) ≥ 0,75 « bonne », de 0,5 à 0,75 « difficile », < 0,5 ou pas de semis « perdue ». Pas de rendement en kg.
- `rejeu.ts` — rejoue une rotation : la culture de l'année N de la rotation est semée chaque saison d'indice N modulo 3 ; les régions à deux saisons rejouent la saison principale. Résumé : nombre de saisons bonnes / difficiles / perdues et pire saison, avec sa cause en une phrase (« 2015 : 9 jours secs pendant la floraison du maïs »).

**Intégration.**
- La note « sécheresse » d'une rotation tient compte de sa part de bonnes saisons (règle écrite dans `notes.ts`).
- Le facteur « historique » de la confiance est calculé (part des années disponibles dans la série) au lieu d'être fixe.

**Écran.** Section « Rejouée sur 20 saisons réelles » sur le détail de rotation (et résumé « 18 bonnes saisons sur 20 » sur chaque carte) : frise animée 2005 → 2025, une pastille par saison (vert, orange, rouge), le détail d'une saison au toucher (bouton accessible), la source (NASA POWER, journalier) et l'hypothèse du sol.

## Bloc 2 — Votre champ vers 2050
**Données.** Nouveau script `build_projections.py` :
- source : NASA NEX-GDDP-CMIP6 v2.0, serveur NCCS THREDDS, découpage par zone (NetCDF Subset Service) sur la boîte 4°N–11°N, 9°W–2,5°W ;
- requêtes : une par modèle × scénario × variable × année, environ 540 au total (vérifié accessible sans compte) ;
- modèles : IPSL-CM6A-LR, MRI-ESM2-0, GFDL-ESM4 ;
- périodes : référence historique 1995–2014, futur 2041–2060 ;
- scénarios : SSP2-4.5 (modéré), SSP5-8.5 (pessimiste) ;
- extraction de la maille de 25 km de chaque chef-lieu, unités converties (kg m⁻² s⁻¹ → mm/j, K → °C) ;
- les séries journalières par région restent dans `data/raw/` (ignoré par git si trop lourd) ; le dépôt garde le résultat.

**Calcul (dans le pipeline, pour les 8 cultures et par région).** Le moteur de saison est porté en Python (`data/pipeline/saison.py`), avec des cas de test identiques à ceux du TypeScript pour garantir les mêmes résultats. Pour chaque modèle, scénario et culture : part des bonnes saisons sur la référence, puis vers 2050, et l'écart entre les deux. Résultat dans `data/projections/<region>.json` : `{ meta, cultures: { [culture]: { [scenario]: { [modele]: ecart } } } }`.

**Côté site.** Pour une rotation : on prend sa part réelle de bonnes saisons (bloc 1) et on y applique l'écart moyen des cultures de la rotation, modèle par modèle → une fourchette (min–max sur les 3 modèles) par scénario. Si les modèles donnent des écarts de signes opposés supérieurs à 5 points, la phrase dit « les modèles ne s'accordent pas » au lieu de trancher.

**Écran.** Section « Votre champ vers 2050 » sous le rejeu :
- un sélecteur modéré / pessimiste ;
- trois barres : aujourd'hui (mesuré), vers 2050 en modéré et en pessimiste, la fourchette des modèles étant visible ;
- une phrase calculée par des règles ;
- la mention « Projection, pas prévision » et les sources.

Sur la page des rotations, un badge « tient en 2050 » marque la rotation dont la fourchette pessimiste est la plus haute.

## Bloc 3 — Alerte « semez maintenant »
**Site.**
- `frontend/src/lib/moteur/saison/etat.ts` donne l'état du moment à partir des 20 derniers jours de pluie, avec la règle de semis du bloc 1. Les états possibles :
  - `seche` : avant la saison ;
  - `premieres_pluies` : pluie tombée, règle pas encore remplie ;
  - `fenetre_ouverte` : avec la date d'ouverture ;
  - `poche_seche` : 7 jours secs après des pluies.
- La route `GET /api/semis/[region]` lit NASA POWER (journalier, derniers jours publiés), garde le résultat 6 h en cache et renvoie `{ etat, depuis?, message, culture, dateDonnees }`. Erreur claire (503) si NASA POWER ne répond pas.
- La carte du haut de l'Accueil affiche cet état en direct.

**App** (`expo-notifications`, `expo-background-task`, `expo-task-manager`) :
- interrupteur « M'alerter quand semer » sur l'onglet Accueil, avec demande d'autorisation de notification ;
- tâche de fond (intervalle demandé : 12 h ; Android peut la retarder) qui interroge `/api/semis/<région>` ;
- notification seulement au **passage** vers `fenetre_ouverte` ou `poche_seche` : le dernier état notifié est gardé dans AsyncStorage, jamais deux fois le même événement ;
- message avec la culture à semer selon la rotation conseillée ;
- la région est lue depuis la page (message `parcelle` envoyé par le site à l'app) et ne quitte pas le téléphone, sauf dans l'adresse de l'API ;
- bouton « Tester l'alerte » : vraie notification immédiate avec l'état réel, pour la démo.

## Bloc 4 — Photo + satellite
**Prise de vue.**
- Dans l'onglet Champ, un bouton « Photographier mon champ » :
  - dans l'app : message `photo` → appareil photo natif (`expo-image-picker`) → image renvoyée à la page en JPEG base64 ;
  - dans le navigateur : champ fichier.
- Réduction à 1024 px de côté, qualité 0,7, sur l'appareil, avant l'envoi.
- Avant la prise de vue, l'écran prévient : la photo est envoyée à un service d'IA pour l'analyse, n'est pas enregistrée, et la position est arrondie à 0,01° (environ 1 km).

**Serveur.** `POST /api/photo` reçoit `{ image (≤ 2 Mo), lat, lon }`.
- **Vision :** le modèle de vision (`nvidia/nemotron-3.5-super-vl:free` par défaut, réglable par `LLM_VISION_MODEL`) reçoit une consigne stricte et doit répondre en JSON, validé par zod :
  - `{ culture: 8 cultures | "inconnue" | "aucune", couvertureSol: 0–100, etat: "vigoureux" | "jaunissement" | "sec" | "sol_nu", remarque: ≤ 160 caractères }`.
  - Si la réponse est invalide, l'écran affiche « Analyse impossible, reprenez la photo de plus loin, en plein jour ».
- **Satellite :**
  - NDVI MODIS mensuel du dernier mois publié, lu sur la tuile NASA GIBS au point (fenêtre de 3 × 3 pixels), avec la palette officielle (portage TypeScript de `ndvi_gibs.py`, décodage PNG par `pngjs`) ;
  - comparé à la normale du même mois dans la région.
- **Verdict par règles :**
  - « concordent » : NDVI ≥ 0,5 et couverture ≥ 60 %, ou NDVI < 0,3 et couverture < 30 % ;
  - sinon « divergent », avec les raisons possibles (pixel de 250 m qui voit aussi les champs voisins, mois satellite différent du jour de la photo, nuages), sans trancher.
- **Lien avec la rotation :** par exemple, sol nu en saison des pluies → couverture proposée par la rotation conseillée.

**Écran.** Deux cartes « Ce que voit votre téléphone » et « Ce que voit la NASA », puis le verdict et le lien vers la rotation.

## Hors de ce chantier
Voix en dioula ou baoulé (modèles ouverts encore trop faibles), notifications envoyées par un serveur (Firebase), rendement en kg, carte du sol de la parcelle (SoilGrids), iOS.

## Tests
- **Moteur (Vitest) :** semis (sec, idéal, faux départ suivi d'une poche sèche), ET0 de Hargreaves sur une valeur de référence FAO-56, bilan d'eau, verdicts, rejeu d'une rotation, écart 2050 et désaccord des modèles, états du moment.
- **Pipeline (Python) :** lecture d'un extrait NetCDF du dépôt, conversions d'unités, mêmes cas de semis et de bilan que le TypeScript (résultats identiques).
- **Routes :** `/api/semis` (POWER en panne) et `/api/photo` (image trop lourde, JSON du modèle invalide, tuile GIBS du dépôt).
- **e2e :**
  - frise du rejeu visible et pastille cliquable ;
  - changement de scénario 2050 ;
  - état de semis sur l'Accueil ;
  - parcours photo avec le modèle simulé ;
  - aucune page plus large qu'un écran de 360 px.
- **Mobile :** vérification de types, lint, `expo-doctor` ; un build EAS à la fin des blocs 3 et 4 fait foi.

## Ce que l'utilisateur fournit
Rien de nouveau : la clé OpenRouter et le compte Expo sont déjà en place. Il installe l'APK final et teste l'alerte et la photo sur un vrai téléphone.
