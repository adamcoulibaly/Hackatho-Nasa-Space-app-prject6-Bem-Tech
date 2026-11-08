# backend — API de recommandation (membre 3, Modèle et IA)

Prévu : FastAPI (Python). Pas encore de code : l'interface lit des JSON (voir `docs/contrat-donnees.md`).

## À livrer
- Un endpoint qui renvoie, pour une parcelle (région, surface, cultures, eau, priorités, matériel), les trois rotations au format `Rotation` du contrat (aujourd'hui calculées dans le navigateur par `frontend/src/lib/moteur/`) :
  7 scores de 1 à 5, niveau de confiance (4 facteurs), lacune, calendrier sur 3 ans, sources.
- Le score reste transparent : chaque note se justifie en une phrase (règles agronomiques).
- L'IA détecte (saison des pluies, sol nu, anomalies) ; les règles recommandent.

Quand l'API existe, l'interface bascule en changeant uniquement `frontend/src/lib/data` (variable `NEXT_PUBLIC_API_URL`).
