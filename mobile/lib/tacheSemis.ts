/**
 * Tâche de fond « semez maintenant » : environ toutes les 12 h (Android peut la retarder), l'app lit l'état de semis
 * de la région sur le site (/api/semis/<région>, NASA POWER) et notifie au passage vers une fenêtre ouverte ou une poche sèche.
 * La région et la culture viennent de la page d'accueil du site ; elles restent sur le téléphone.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundTask from "expo-background-task";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { alertesANotifier, cleAlerte, decider, memoriser, noterMeteo, texteAlerte, texteMeteo, type AlerteMeteo, type DerniersMeteo, type EtatSemis } from "@/lib/alerte";
import { WEB_URL } from "@/lib/config";

export const TACHE = "forosat-semis";
const CLE = "forosat.alerte";
const CANAL = "semis";

export type Reglage = { active: boolean; region: string | null; culture: string | null; annonces: string[]; meteo: DerniersMeteo };
const VIDE: Reglage = { active: false, region: null, culture: null, annonces: [], meteo: {} };

export async function lireReglage(): Promise<Reglage> {
  try {
    return { ...VIDE, ...JSON.parse((await AsyncStorage.getItem(CLE)) ?? "{}") };
  } catch {
    return VIDE;
  }
}

export async function ecrireReglage(maj: Partial<Reglage>): Promise<Reglage> {
  const r = { ...(await lireReglage()), ...maj };
  await AsyncStorage.setItem(CLE, JSON.stringify(r)).catch(() => undefined);
  return r;
}

type EtatDuJour = EtatSemis & { message?: string; alertes?: AlerteMeteo[] };

async function etatDuJour(region: string): Promise<EtatDuJour | null> {
  const r = await fetch(`${WEB_URL}/api/semis/${encodeURIComponent(region)}`);
  if (!r.ok) return null;
  const j = (await r.json()) as EtatDuJour;
  return typeof j?.etat === "string" ? j : null;
}

async function notifier(region: string, culture: string | null, etat: string) {
  const t = texteAlerte(region, culture, etat);
  await Notifications.scheduleNotificationAsync({ content: { title: t.titre, body: t.corps }, trigger: null });
}

/** Vérifie l'état et notifie s'il le faut ; `forcer` (bouton « Tester l'alerte ») notifie l'état réel quoi qu'il arrive. */
export async function verifier(forcer = false): Promise<boolean> {
  const reglage = await lireReglage();
  if (!reglage.region || (!reglage.active && !forcer)) return false;
  const etat = await etatDuJour(reglage.region).catch(() => null);
  // Réseau ou NASA POWER indisponible : rien ne change, on réessaiera.
  if (!etat) {
    if (forcer) await Notifications.scheduleNotificationAsync({ content: { title: "ForoSat", body: "Données NASA POWER indisponibles pour le moment." }, trigger: null });
    return false;
  }
  if (forcer) {
    const t = texteAlerte(reglage.region, reglage.culture, etat.etat);
    const premiere = etat.alertes?.[0];
    const corps = premiere ? texteMeteo(reglage.region, premiere).corps : etat.etat === "fenetre_ouverte" || etat.etat === "poche_seche" ? t.corps : etat.message ?? "Pas encore le moment de semer.";
    await Notifications.scheduleNotificationAsync({ content: { title: "ForoSat · test de l'alerte", body: corps }, trigger: null });
    return true;
  }
  let annonces = reglage.annonces;
  let notifie = false;
  if (decider(annonces, etat)) {
    await notifier(reglage.region, reglage.culture, etat.etat);
    annonces = memoriser(annonces, cleAlerte(etat));
    notifie = true;
  }
  // Alertes météo (sécheresse, fortes pluies), chacune avec son conseil : au plus une par type tous les 7 jours,
  // gardées à part pour ne jamais effacer la mémoire de l'alerte de semis.
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const meteo = alertesANotifier(reglage.meteo, etat.alertes, aujourdhui);
  for (const a of meteo) {
    const t = texteMeteo(reglage.region, a);
    await Notifications.scheduleNotificationAsync({ content: { title: t.titre, body: t.corps }, trigger: null });
  }
  if (notifie || meteo.length) await ecrireReglage({ annonces, meteo: noterMeteo(reglage.meteo, meteo, aujourdhui) });
  notifie = notifie || meteo.length > 0;
  return notifie;
}

TaskManager.defineTask(TACHE, async () => {
  try {
    await verifier();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** Autorisation, canal Android et inscription de la tâche ; false si l'utilisateur refuse les notifications. */
export async function activer(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return false;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CANAL, { name: "Semis", importance: Notifications.AndroidImportance.HIGH });
  }
  await BackgroundTask.registerTaskAsync(TACHE, { minimumInterval: 720 });
  await ecrireReglage({ active: true });
  return true;
}

export async function desactiver(): Promise<void> {
  if (await TaskManager.isTaskRegisteredAsync(TACHE)) await BackgroundTask.unregisterTaskAsync(TACHE);
  await ecrireReglage({ active: false });
}
