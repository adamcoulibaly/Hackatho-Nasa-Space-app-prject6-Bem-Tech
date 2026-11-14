import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Tabs, router } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { demanderChemin, estCheminInterne, estOnglet } from "@/lib/onglets";
import type { ColorValue } from "react-native";
import { COULEURS } from "@/lib/config";

const icone = (nom: SymbolViewProps["name"]) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <SymbolView name={nom} tintColor={color} size={24} />;
  };

export default function Onglets() {
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
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COULEURS.orange,
        tabBarInactiveTintColor: "#C9D4CD",
        tabBarStyle: { backgroundColor: COULEURS.encre, borderTopColor: COULEURS.ligne },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}>
      <Tabs.Screen name="tableau" options={{ title: "Accueil", tabBarIcon: icone({ ios: "house", android: "home", web: "home" }) }} />
      <Tabs.Screen name="climat" options={{ title: "Climat", tabBarIcon: icone({ ios: "drop", android: "water_drop", web: "water_drop" }) }} />
      <Tabs.Screen name="rotations" options={{ title: "Rotations", tabBarIcon: icone({ ios: "arrow.triangle.2.circlepath", android: "autorenew", web: "autorenew" }) }} />
      <Tabs.Screen name="champ" options={{ title: "Champ", tabBarIcon: icone({ ios: "mappin.and.ellipse", android: "location_on", web: "location_on" }) }} />
    </Tabs>
  );
}
