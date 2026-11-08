// Point d'entrée : la tâche de fond « semez maintenant » est définie avant tout rendu,
// pour qu'Android puisse la lancer même quand l'app est fermée (démarrage sans écran).
import "./lib/tacheSemis";
import "expo-router/entry";
