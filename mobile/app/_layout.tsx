import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { COULEURS } from "@/lib/config";

export { ErrorBoundary } from "expo-router";

// L'écran de démarrage s'efface en fondu au lieu de disparaître d'un coup.
SplashScreen.setOptions({ duration: 300, fade: true });

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
