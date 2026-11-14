import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { COULEURS } from "@/lib/config";

const CLE = "forosat.entree";
/** Les éléments arrivent en cascade, de haut en bas (mouvement réduit respecté par Reanimated). */
const entree = (i: number) => FadeInDown.delay(80 * i).duration(400).springify().damping(18);
type Role = "agriculteur" | "conseiller";

/** Écran d'entrée : rôle et langue, affiché une seule fois. */
export default function Entree() {
  const [vu, setVu] = useState<boolean | null>(null);
  const [role, setRole] = useState<Role>("agriculteur");

  useEffect(() => {
    AsyncStorage.getItem(CLE)
      .then((v) => setVu(v !== null))
      .catch(() => setVu(false));
  }, []);

  if (vu === null) return <View style={styles.fond} />;
  if (vu) return <Redirect href="/(onglets)/tableau" />;

  const commencer = async () => {
    await AsyncStorage.setItem(CLE, role).catch(() => undefined);
    router.replace("/(onglets)/champ");
  };

  return (
    <SafeAreaView style={styles.fond}>
      <Animated.Text entering={entree(0)} style={styles.marque}>
        foro<Text style={{ color: COULEURS.orange }}>sat</Text>
      </Animated.Text>
      <Animated.Text entering={entree(1)} style={styles.titre}>Lire le ciel pour mieux cultiver.</Animated.Text>

      <Animated.Text entering={entree(2)} style={styles.legende}>JE SUIS</Animated.Text>
      <Animated.View entering={entree(3)} style={styles.ligne}>
        {(
          [
            ["agriculteur", "Agriculteur", "Mon champ"],
            ["conseiller", "Conseiller", "Mes agriculteurs"],
          ] as const
        ).map(([id, titre, sous]) => {
          const actif = role === id;
          return (
            <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: actif }} onPress={() => setRole(id)} style={({ pressed }) => [styles.choix, actif && styles.choixActif, pressed && styles.enfonce]}>
              <Text style={[styles.choixTitre, actif && { color: COULEURS.encre }]}>{titre}</Text>
              <Text style={[styles.choixSous, actif && { color: COULEURS.encre }]}>{sous}</Text>
            </Pressable>
          );
        })}
      </Animated.View>

      <Animated.Text entering={entree(4)} style={styles.legende}>LANGUE</Animated.Text>
      <Animated.View entering={entree(5)} style={styles.ligne}>
        <View style={[styles.langue, { backgroundColor: COULEURS.papier }]}>
          <Text style={{ fontWeight: "700", color: COULEURS.encre }}>Français</Text>
        </View>
        {["Dioula", "Baoulé"].map((l) => (
          <View key={l} accessibilityState={{ disabled: true }} style={styles.langue}>
            <Text style={{ color: COULEURS.attenue, fontWeight: "600" }}>{l}</Text>
            <Text style={{ color: COULEURS.attenue, fontSize: 11 }}>bientôt</Text>
          </View>
        ))}
      </Animated.View>

      <View style={{ flex: 1 }} />
      <Animated.View entering={entree(6)}>
        <Pressable accessibilityRole="button" onPress={commencer} style={({ pressed }) => [styles.cta, pressed && styles.enfonce]}>
          <Text style={styles.ctaTexte}>Commencer</Text>
        </Pressable>
      </Animated.View>
      <Text style={styles.pied}>NASA Space Apps 2026 · BEM TECH</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  enfonce: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  fond: { flex: 1, backgroundColor: COULEURS.encre, paddingHorizontal: 22, paddingBottom: 16 },
  marque: { marginTop: 24, fontSize: 24, fontWeight: "800", color: COULEURS.papier },
  titre: { marginTop: 12, marginBottom: 24, fontSize: 32, fontWeight: "800", lineHeight: 36, color: COULEURS.papier },
  legende: { marginTop: 8, marginBottom: 8, fontSize: 13, letterSpacing: 1.5, color: COULEURS.attenue },
  ligne: { flexDirection: "row", gap: 8, marginBottom: 12 },
  choix: { flex: 1, minHeight: 64, borderRadius: 18, borderWidth: 1, borderColor: COULEURS.ligne, padding: 14, justifyContent: "center" },
  choixActif: { backgroundColor: COULEURS.orange, borderColor: COULEURS.orange },
  choixTitre: { fontSize: 15, fontWeight: "700", color: COULEURS.papier },
  choixSous: { fontSize: 13, color: COULEURS.attenue },
  langue: { flex: 1, minHeight: 48, borderRadius: 999, borderWidth: 1, borderColor: COULEURS.ligne, alignItems: "center", justifyContent: "center" },
  cta: { minHeight: 58, borderRadius: 999, backgroundColor: COULEURS.orange, alignItems: "center", justifyContent: "center" },
  ctaTexte: { fontSize: 17, fontWeight: "700", color: COULEURS.encre },
  pied: { marginTop: 12, textAlign: "center", fontSize: 13, color: COULEURS.attenue },
});
