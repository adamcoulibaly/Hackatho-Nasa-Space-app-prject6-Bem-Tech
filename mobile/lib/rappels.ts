/**
 * Rappels de saison : notifications programmées sur le téléphone à 8 h (préparation, semis, sarclages, floraison,
 * carnet, prix, récolte). Elles sonnent même sans internet ; toucher un rappel ouvre la page utile.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { prochainRappel, quand, type RappelSaison } from "@/lib/rappelsListe";

const CLE = "forosat.rappels";
const CANAL = "rappels";
const PREFIXE = "rappel-";

type Etat = { active: boolean; liste: RappelSaison[] };

async function lire(): Promise<Etat> {
  try {
    return { active: false, liste: [], ...JSON.parse((await AsyncStorage.getItem(CLE)) ?? "{}") };
  } catch {
    return { active: false, liste: [] };
  }
}

async function annulerTout() {
  const prevus = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  await Promise.all(prevus.filter((n) => n.identifier.startsWith(PREFIXE)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

export type ReponseRappels = { type: "rappels"; etat: "active" | "inactive" | "refus"; prochain?: string };

/** Remplace les rappels programmés par la nouvelle liste ; « refus » si les notifications sont refusées. */
export async function programmerRappels(liste: RappelSaison[]): Promise<ReponseRappels> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return { type: "rappels", etat: "refus" };
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CANAL, { name: "Rappels de saison", importance: Notifications.AndroidImportance.DEFAULT });
  }
  await annulerTout();
  const maintenant = new Date();
  for (const r of liste) {
    if (quand(r.date) <= maintenant) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIXE}${r.id}`,
      content: { title: r.titre, body: r.texte, data: { onglet: r.onglet, chemin: r.chemin } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: quand(r.date), channelId: CANAL },
    });
  }
  await AsyncStorage.setItem(CLE, JSON.stringify({ active: true, liste })).catch(() => undefined);
  return { type: "rappels", etat: "active", prochain: prochainRappel(liste) };
}

export async function arreterRappels(): Promise<ReponseRappels> {
  await annulerTout();
  await AsyncStorage.setItem(CLE, JSON.stringify({ active: false, liste: [] })).catch(() => undefined);
  return { type: "rappels", etat: "inactive" };
}

export async function etatRappels(): Promise<ReponseRappels> {
  const e = await lire();
  return e.active ? { type: "rappels", etat: "active", prochain: prochainRappel(e.liste) } : { type: "rappels", etat: "inactive" };
}
