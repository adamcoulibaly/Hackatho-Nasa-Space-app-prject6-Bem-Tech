import { Tabs, router } from "expo-router";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { demanderChemin, estCheminInterne, estOnglet } from "@/lib/onglets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COULEURS } from "@/lib/config";
import { BarreOnglets, hauteurReservee } from "@/components/BarreOnglets";

export default function Onglets() {
  const insets = useSafeAreaInsets();
  // Toucher une notification (rappel de saison, alerte) ouvre la page qu'elle annonce, dans le bon onglet.
  const reponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const data = reponse?.notification.request.content.data as { onglet?: unknown; chemin?: unknown } | undefined;
    if (!data || !estOnglet(data.onglet) || !estCheminInterne(data.chemin)) return;
    demanderChemin(data.onglet, data.chemin);
    router.navigate(`/(onglets)/${data.onglet}`);
    Notifications.clearLastNotificationResponse();
  }, [reponse]);
  return (
    <Tabs
      // Petite vibration au toucher d'un onglet (retour tactile).
      screenListeners={{ tabPress: () => void Haptics.selectionAsync().catch(() => undefined) }}
      screenOptions={{
        headerShown: false,
        // Changement d'onglet en glissé-fondu, comme une page qui se décale.
        animation: "shift",
        // Barre flottante comme celle du site : la page s'arrête juste au-dessus, sur le fond papier du site.
        sceneStyle: { backgroundColor: COULEURS.papier, paddingBottom: hauteurReservee(insets.bottom) },
      }}
      tabBar={(props) => <BarreOnglets {...props} />}>
      <Tabs.Screen name="tableau" options={{ title: "Accueil" }} />
      <Tabs.Screen name="climat" options={{ title: "Climat" }} />
      <Tabs.Screen name="rotations" options={{ title: "Rotations" }} />
      <Tabs.Screen name="champ" options={{ title: "Champ" }} />
    </Tabs>
  );
}
