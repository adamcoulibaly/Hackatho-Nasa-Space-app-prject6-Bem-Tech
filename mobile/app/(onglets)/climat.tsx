import { SafeAreaView } from "react-native-safe-area-context";
import { PageWeb } from "@/components/PageWeb";
import { COULEURS } from "@/lib/config";

export default function Ecran() {
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: COULEURS.encre }}>
      <PageWeb onglet="climat" chemin="/climat" />
    </SafeAreaView>
  );
}
