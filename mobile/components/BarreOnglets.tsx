import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { BottomTabBarProps } from "expo-router/tabs";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { COULEURS } from "@/lib/config";

/** Mêmes mesures que la barre du bas du site sur téléphone. */
export const BARRE = { hauteur: 66, marge: 16, interieur: 6, ecart: 4 } as const;

/** Hauteur réservée en bas de chaque onglet, pour que la page ne passe jamais sous la barre. */
export function hauteurReservee(basSur: number): number {
  return BARRE.hauteur + BARRE.marge * 2 + basSur;
}

type Icone = SymbolViewProps["name"];
const ICONES: Record<string, Icone> = {
  tableau: { ios: "house", android: "home", web: "home" },
  climat: { ios: "drop", android: "water_drop", web: "water_drop" },
  rotations: { ios: "text.alignleft", android: "notes", web: "notes" },
  champ: { ios: "mappin.and.ellipse", android: "location_on", web: "location_on" },
};

const RESSORT = { damping: 18, stiffness: 220, mass: 0.9 };

/**
 * Barre d'onglets de l'app, dessinée comme celle du site sur téléphone : une pilule sombre qui flotte en bas,
 * une pastille claire qui glisse jusqu'à l'onglet ouvert, et l'icône active qui rebondit.
 */
export function BarreOnglets({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const [largeur, setLargeur] = useState(0);
  const nb = state.routes.length;
  const onglet = nb > 0 ? (largeur - BARRE.ecart * (nb - 1)) / nb : 0;
  const x = useSharedValue(0);
  const premier = useSharedValue(true);

  useEffect(() => {
    if (onglet <= 0) return;
    const cible = state.index * (onglet + BARRE.ecart);
    // Première mesure : la pastille se pose sans glisser.
    x.value = premier.value ? cible : withSpring(cible, RESSORT);
    premier.value = false;
  }, [state.index, onglet, x, premier]);

  const pastille = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const mesurer = (e: LayoutChangeEvent) => setLargeur(e.nativeEvent.layout.width);

  return (
    <View pointerEvents="box-none" style={[styles.cadre, { bottom: BARRE.marge + insets.bottom }]}>
      <View role="tablist" style={styles.barre}>
        <View style={styles.rangee} onLayout={mesurer}>
          {onglet > 0 && <Animated.View pointerEvents="none" style={[styles.pastille, { width: onglet }, pastille]} />}
          {state.routes.map((route, i) => {
            const { options } = descriptors[route.key];
            const actif = i === state.index;
            const titre = typeof options.title === "string" ? options.title : route.name;
            const appuyer = () => {
              const evenement = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!actif && !evenement.defaultPrevented) navigateToTab(route.key);
            };
            return (
              <Pressable
                key={route.key}
                role="tab"
                accessibilityState={{ selected: actif }}
                accessibilityLabel={titre}
                onPress={appuyer}
                onLongPress={() => emitter.emit({ type: "tabLongPress", target: route.key })}
                style={({ pressed }) => [styles.onglet, pressed && styles.enfonce]}
              >
                <IconeOnglet nom={ICONES[route.name] ?? ICONES.tableau} actif={actif} />
                <Text numberOfLines={1} style={[styles.libelle, actif ? styles.libelleActif : null]}>{titre}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/** Icône d'onglet : elle rebondit quand son onglet devient actif (comme sur le site). */
function IconeOnglet({ nom, actif }: { nom: Icone; actif: boolean }) {
  const echelle = useSharedValue(1);
  useEffect(() => {
    if (actif) echelle.value = withSequence(withTiming(0.8, { duration: 100 }), withSpring(1.15, RESSORT), withSpring(1, RESSORT));
  }, [actif, echelle]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: echelle.value }] }));
  return (
    <Animated.View style={style}>
      <SymbolView name={nom} tintColor={actif ? COULEURS.encre : "#C9D4CD"} size={20} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cadre: { position: "absolute", left: BARRE.marge, right: BARRE.marge },
  barre: {
    height: BARRE.hauteur,
    borderRadius: 999,
    backgroundColor: COULEURS.encre,
    padding: BARRE.interieur,
    // Ombre douce, comme sur le site.
    shadowColor: COULEURS.encre,
    shadowOpacity: 0.25,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  rangee: { flex: 1, flexDirection: "row", gap: BARRE.ecart },
  pastille: { position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: 999, backgroundColor: COULEURS.papier },
  onglet: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2, borderRadius: 999 },
  enfonce: { transform: [{ scale: 0.96 }], opacity: 0.9 },
  libelle: { fontSize: 11, fontWeight: "600", color: "#C9D4CD" },
  libelleActif: { fontWeight: "700", color: COULEURS.encre },
});
