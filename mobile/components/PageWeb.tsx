import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as Speech from "expo-speech";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactElement, type Ref } from "react";
import { ActivityIndicator, BackHandler, Linking, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { COULEURS, WEB_URL, estPageForoSat, urlPage } from "@/lib/config";
import { demanderChemin, estCheminInterne, estOnglet, inscrirePage, prendreCheminEnAttente, type Onglet } from "@/lib/onglets";
import { activer, desactiver, ecrireReglage, lireReglage, verifier } from "@/lib/tacheSemis";
import { prendrePhoto } from "@/lib/photo";
import { texteALire } from "@/lib/alerte";

type Message =
  | { type: "position" }
  | { type: "partager"; url: string; texte: string }
  | { type: "ouvrir"; onglet: unknown; chemin: unknown }
  | { type: "parcelle"; region: unknown; culture: unknown }
  | { type: "alerte"; action: unknown }
  | { type: "photo" }
  | { type: "lire"; texte: unknown };

/**
 * Propriétés de WebView utilisées ici. Les types fournis par react-native-webview 14.0.1 se réduisent à `never`
 * avec React 19.3 + TypeScript 6 (intersection iOS/Android/Windows incompatible) : on type localement ce qu'on utilise.
 */
type PropsWebView = {
  ref?: Ref<WebView>;
  source: { uri: string };
  onMessage: (e: WebViewMessageEvent) => void;
  onNavigationStateChange: (e: { canGoBack: boolean }) => void;
  onError: () => void;
  onHttpError: (e: { nativeEvent: { statusCode: number } }) => void;
  onShouldStartLoadWithRequest: (r: { url: string }) => boolean;
  geolocationEnabled?: boolean;
  pullToRefreshEnabled?: boolean;
  startInLoadingState?: boolean;
  renderLoading?: () => ReactElement;
  style?: object;
};
const VueWeb = WebView as unknown as ComponentType<PropsWebView>;

/** Ouvre un lien externe (WhatsApp, source NASA…) hors de l'app, sans planter s'il n'a pas d'application. */
function ouvrirAilleurs(url: string) {
  Linking.openURL(url).catch(() => {});
}

/**
 * La page du site d'un onglet, avec GPS et partage natifs et un écran hors connexion.
 * Les onglets restent synchronisés : la parcelle est relue à chaque retour sur l'onglet,
 * et une page d'un autre onglet (ex. « Analyser ma parcelle » → Climat) s'ouvre dans cet onglet.
 */
export function PageWeb({ onglet, chemin }: { onglet: Onglet; chemin: string }) {
  const vue = useRef<WebView>(null);
  const peutRevenir = useRef(false);
  const [erreur, setErreur] = useState(false);
  const [cle, setCle] = useState(0);
  const [depart, setDepart] = useState(() => prendreCheminEnAttente(onglet) ?? chemin);

  const repondre = useCallback((m: object) => {
    vue.current?.postMessage(JSON.stringify(m));
  }, []);

  // Demandes venues d'un autre onglet : la page déjà chargée navigue sans se recharger.
  useEffect(() => inscrirePage(onglet, (c) => (vue.current ? repondre({ type: "aller", chemin: c }) : setDepart(c))), [onglet, repondre]);

  useFocusEffect(
    useCallback(() => {
      // Retour sur l'onglet : la parcelle a pu changer ailleurs.
      repondre({ type: "sync" });
      // Bouton retour Android : d'abord l'historique de la page, ensuite le comportement normal.
      const abonnement = BackHandler.addEventListener("hardwareBackPress", () => {
        if (!peutRevenir.current || !vue.current) return false;
        vue.current.goBack();
        return true;
      });
      return () => abonnement.remove();
    }, [repondre]),
  );

  const recevoir = useCallback(
    async (e: WebViewMessageEvent) => {
      // Seules les pages du site ForoSat parlent à l'app.
      if (!estPageForoSat(e.nativeEvent.url)) return;
      let m: Message;
      try {
        m = JSON.parse(e.nativeEvent.data);
      } catch {
        return;
      }
      if (m.type === "position") {
        // La page attend toujours une réponse : position, refus ou GPS indisponible.
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") return repondre({ type: "position", erreur: "refus" });
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          repondre({ type: "position", lat: pos.coords.latitude, lon: pos.coords.longitude });
        } catch {
          repondre({ type: "position", erreur: "indisponible" });
        }
      } else if (m.type === "partager") {
        await Share.share({ message: `${m.texte}\n${m.url}` }).catch(() => {});
      } else if (m.type === "parcelle" && typeof m.region === "string" && /^[a-z-]{2,40}$/.test(m.region)) {
        await ecrireReglage({ region: m.region, culture: typeof m.culture === "string" ? m.culture.slice(0, 40) : null });
        const r = await lireReglage();
        repondre({ type: "alerte", etat: r.active ? "active" : "inactive" });
      } else if (m.type === "alerte") {
        if (m.action === "activer") repondre({ type: "alerte", etat: (await activer().catch(() => false)) ? "active" : "refus" });
        else if (m.action === "desactiver") {
          await desactiver().catch(() => undefined);
          repondre({ type: "alerte", etat: "inactive" });
        } else if (m.action === "tester") {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status !== "granted") repondre({ type: "alerte", etat: "refus" });
          else await verifier(true).catch(() => false);
        }
      } else if (m.type === "lire") {
        // Lecture à voix haute en français avec la voix du téléphone (la page la demande, le téléphone lit).
        const texte = texteALire(m.texte);
        if (texte) {
          Speech.stop();
          Speech.speak(texte, { language: "fr-FR" });
        }
      } else if (m.type === "photo") {
        repondre(await prendrePhoto().catch(() => ({ type: "photo" as const, erreur: "annule" as const })));
      } else if (m.type === "ouvrir" && estOnglet(m.onglet) && estCheminInterne(m.chemin)) {
        if (m.onglet === onglet) return repondre({ type: "aller", chemin: m.chemin });
        demanderChemin(m.onglet, m.chemin);
        router.navigate(`/(onglets)/${m.onglet}`);
      }
    },
    [repondre, onglet],
  );

  if (!WEB_URL) {
    return (
      <View style={styles.centre}>
        <Text style={styles.titre}>Adresse du site manquante</Text>
        <Text style={styles.texte}>Cette version de l’app a été construite sans EXPO_PUBLIC_WEB_URL.</Text>
      </View>
    );
  }
  if (erreur) {
    return (
      <View style={styles.centre}>
        <Text style={styles.titre}>Pas de connexion</Text>
        <Text style={styles.texte}>ForoSat a besoin d’internet pour charger les données NASA. Vérifiez votre connexion.</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.bouton}
          onPress={() => {
            setErreur(false);
            setCle((k) => k + 1);
          }}>
          <Text style={styles.boutonTexte}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <VueWeb
      key={cle}
      ref={vue}
      source={{ uri: urlPage(depart) }}
      onMessage={recevoir}
      onNavigationStateChange={(e) => {
        peutRevenir.current = e.canGoBack;
      }}
      onError={() => setErreur(true)}
      onHttpError={(e) => e.nativeEvent.statusCode >= 500 && setErreur(true)}
      onShouldStartLoadWithRequest={(r) => {
        if (estPageForoSat(r.url) || r.url.startsWith("about:")) return true;
        ouvrirAilleurs(r.url);
        return false;
      }}
      geolocationEnabled
      pullToRefreshEnabled
      startInLoadingState
      renderLoading={() => (
        <View style={styles.centre}>
          <ActivityIndicator color={COULEURS.orange} size="large" />
        </View>
      )}
      style={{ backgroundColor: COULEURS.papier }}
    />
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24, backgroundColor: COULEURS.papier },
  titre: { fontSize: 22, fontWeight: "700", color: COULEURS.encre, textAlign: "center" },
  texte: { fontSize: 16, color: "#4A5A51", textAlign: "center", lineHeight: 22 },
  bouton: { marginTop: 8, minHeight: 48, paddingHorizontal: 24, borderRadius: 999, backgroundColor: COULEURS.orange, justifyContent: "center" },
  boutonTexte: { fontSize: 17, fontWeight: "700", color: COULEURS.encre },
});
