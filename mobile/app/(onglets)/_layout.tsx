import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { COULEURS } from "@/lib/config";

const icone = (nom: SymbolViewProps["name"]) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <SymbolView name={nom} tintColor={color} size={24} />;
  };

export default function Onglets() {
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
