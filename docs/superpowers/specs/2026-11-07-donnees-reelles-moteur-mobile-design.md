# ForoSat — Données réelles, moteur de score et app mobile (chantier 2)

Date : 2026-11-07 · Rendu : 14 novembre 2026

## Objectif
Plus aucune donnée de démonstration à l'écran : chaque valeur affichée vient d'une source citée (NASA, fiche culture sourcée) ou est calculée par une règle visible. Une app mobile Expo installable donne accès à ForoSat sur téléphone.

**Réussite :** un agriculteur de n'importe quelle région choisit ses cultures et ses priorités, et obtient trois rotations calculées pour sa région, avec leur pourquoi, leurs lacunes et leur confiance. L'app Android s'installe depuis un build EAS.

## Décisions prises avec l'utilisateur
1. App mobile : **coque native Expo + WebView** du site.
2. NDVI et GRACE : **compte NASA Earthdata** créé par l'utilisateur ; en attendant, ces blocs sont **masqués**, jamais inventés.
3. Rotations : **moteur de règles + fiches cultures sourcées**, chaque valeur marquée « à valider par l'agronome ».

## Partie A — Moteur de score (priorité 1)
- `knowledge/cultures.json` : 8 cultures (maïs, coton, igname, manioc, arachide, riz, sorgho, niébé). Pour chacune : famille, durée du cycle, besoin en eau sur le cycle, fixation d'azote, tolérance à la sécheresse et à la chaleur, couverture du sol, fourrage. Chaque valeur porte sa source ; revenu et marché sont des **hypothèses** à remplacer par les prix locaux.
- `frontend/src/lib/moteur/` (TypeScript pur, testé) :
  - **Rotation actuelle** = cultures saisies (jusqu'à 3, dans l'ordre).
  - **Deux alternatives** = meilleures suites de 3 cultures parmi les 8, avec contraintes (pas deux fois la même famille d'affilée, au moins une légumineuse), choisies par score pondéré.
  - **7 critères notés de 1 à 5 par des règles écrites** :
    - eau : besoin de la culture face à la pluie de la saison de la région ;
    - sécheresse : tolérance ;
    - fertilité : légumineuses et alternance ;
    - anti-érosion : couverture ;
    - fourrage ;
    - revenu et marché : hypothèses.
  - **Pondération** : les priorités saisies pondèrent les critères. Le matériel pénalise les cultures exigeantes en travail du sol (règle explicite).
  - **Sorties générées** : le pourquoi (phrases déclenchées par les règles), les lacunes (données absentes : prix locaux, sol de la parcelle, NDVI si non branché…), la confiance (4 facteurs calculés) et le calendrier sur 3 ans (cultures placées dans la saison des pluies principale de la région, sol nu ailleurs).
- Les pages Rotations, Détail et Fiche calculent côté navigateur à partir de la parcelle et du climat régional. Le lien de fiche porte les paramètres (`/fiche/B?r=gbeke&c=…&p=…`) pour être reproductible par celui qui le reçoit.
- L'assistant IA reçoit la rotation calculée (validée par le schéma) au lieu d'un fichier fixe.
- `data/pilot/korhogo/rotations.json` est supprimé.

## Partie B — Données réelles (priorité 2)
- **Humidité du sol** : NASA POWER `GWETROOT` (indice 0 à 1, MERRA-2), sans compte. Elle remplit la ligne de la matrice et l'onglet Sol.
- **Alertes** : générées par règles dans le pipeline (chaleur maximale, mois le plus sec, fenêtre humide, deux saisons…), par région.
- **État du moment** (tableau de bord) : derniers 30 jours NASA POWER (pluie, chaleur, humidité) comparés à la normale du mois, par région.
- **NDVI** (MODIS MOD13Q1 via AppEEARS) et **GRACE** (via Earthdata) : branchés dès que le jeton existe. D'ici là, les champs sont absents du contrat (optionnels) et les blocs ne s'affichent pas. L'indicateur « sol nu » est remplacé par « mois le plus sec du sol ».
- **Espace conseiller** : plus de faux agriculteurs, un écran vide qui explique l'usage.
- Les mentions « valeurs d'exemple » disparaissent : chaque bloc cite sa source réelle.

## Partie C — App mobile Expo (priorité 3)
- `mobile/` : Expo (Expo Router), 4 onglets natifs (Accueil, Climat, Rotations, Champ) et un écran d'entrée natif (rôle, langue).
- Chaque onglet affiche la page du site dans une WebView avec `?app=1`. Dans ce mode, le site masque son en-tête et sa barre du bas.
- **Natif :**
  - position GPS (expo-location) envoyée à la carte par message ;
  - partage WhatsApp de la fiche par le partage du téléphone ;
  - écran « hors connexion » si le site est injoignable.
- **Configuration** : adresse du site dans `EXPO_PUBLIC_WEB_URL` (l'URL Vercel). `eas.json` contient le profil `preview` (APK Android) et le profil `production`.
- **Build** : `eas build` avec le jeton Expo de l'utilisateur, transmis par le formulaire sécurisé de l'environnement.

## Hors de ce chantier
iOS sur l'App Store (compte Apple payant), mode hors ligne complet, langues locales, forêt aléatoire.

## Tests
- Moteur : tests unitaires des règles, des contraintes de rotation, de la pondération et des cas limites (aucune culture saisie, une seule culture, région à deux saisons).
- Pipeline : tests Python des nouveaux indicateurs (humidité, alertes, état du moment).
- Web : parcours e2e mis à jour (rotations calculées, changement de priorité qui change le classement, mode `?app=1`).
- Mobile : vérification de types et lancement Expo ; le build EAS fait foi.

## Ce que l'utilisateur fournit
- L'URL Vercel du site.
- Le jeton Expo (formulaire sécurisé).
- Le compte et le jeton NASA Earthdata (formulaire sécurisé).
