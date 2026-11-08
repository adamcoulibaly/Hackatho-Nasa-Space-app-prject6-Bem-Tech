import * as Location from "expo-location";
import { useCallback, useRef, useState, type ComponentType, type ReactElement, type Ref } from "react";
import { ActivityIndicator, Linking, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { COULEURS, WEB_URL, estPageForoSat, urlPage } from "@/lib/config";

type Message = { type: "position" } | { type: "partager"; url: string; texte: string };

/**
 * Propriétés de WebView utilisées ici. Les types fournis par react-native-webview 14.0.1 se réduisent à `never`
 * avec React 19.3 + TypeScript 6 (intersection iOS/Android/Windows incompatible) : on type localement ce qu'on utilise.
 */
type PropsWebView = {
  ref?: Ref<WebView>;
  source: { uri: string };
  onMessage: (e: WebViewMessageEvent) => void;
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

/** Une page du site ForoSat, avec GPS et partage natifs, et un écran hors connexion. */
export function PageWeb({ chemin }: { chemin: string }) {
  const vue = useRef<WebView>(null);
  const [erreur, setErreur] = useState(false);
  const [cle, setCle] = useState(0);

  const repondre = useCallback((m: object) => {
    vue.current?.postMessage(JSON.stringify(m));
  }, []);

  const recevoir = useCallback(
    async (e: WebViewMessageEvent) => {
      let m: Message;
      try {
        m = JSON.parse(e.nativeEvent.data);
      } catch {
        return;
      }
      if (m.type === "position") {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        repondre({ type: "position", lat: pos.coords.latitude, lon: pos.coords.longitude });
      } else if (m.type === "partager") {
        await Share.share({ message: `${m.texte}\n${m.url}` });
      }
    },
    [repondre],
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
      source={{ uri: urlPage(chemin) }}
      onMessage={recevoir}
      onError={() => setErreur(true)}
      onHttpError={(e) => e.nativeEvent.statusCode >= 500 && setErreur(true)}
      onShouldStartLoadWithRequest={(r) => {
        if (estPageForoSat(r.url) || r.url.startsWith("about:")) return true;
        Linking.openURL(r.url);
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
