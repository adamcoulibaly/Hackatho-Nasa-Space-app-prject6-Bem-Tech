import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { COULEURS } from "@/lib/config";
// La tâche de fond doit être définie au chargement de l'app, avant tout rendu.
import "@/lib/tacheSemis";

export { ErrorBoundary } from "expo-router";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COULEURS.encre } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(onglets)" />
      </Stack>
    </>
  );
}
