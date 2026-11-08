import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { COULEURS } from "@/lib/config";

export default function Introuvable() {
  return (
    <View style={styles.fond}>
      <Text style={styles.titre}>Page introuvable</Text>
      <Link href="/(onglets)/tableau" style={styles.lien}>Retour à l’accueil</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, backgroundColor: COULEURS.papier },
  titre: { fontSize: 22, fontWeight: "700", color: COULEURS.encre },
  lien: { fontSize: 16, color: "#00703C", padding: 12 },
});
