/**
 * Climat complet et réel d'un point du monde, calculé à la demande depuis NASA POWER.
 * Portage fidèle du pipeline Python (data/pipeline/climat_complet.py, indicators.py, etat_du_moment.py) :
 * pour un point ivoirien, il donne le même climat que les fichiers pré-calculés (vérifié par les tests).
 */
import type { Climat } from "@/lib/contract";

export const MANQUANT = -999;
export const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MOIS_COURT = ["Jan", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
const SOURCE_SOL = "NASA POWER (MERRA-2)";

export type BrutPower = { properties: { parameter: Record<string, Record<string, number>> } };
export type Lieu = { id: string; chefLieu: string; lat: number; lon: number };
type Cle = string; // "AAAA-M"

/**
 * Arrondi de Python, au bit près : la valeur binaire exacte du nombre est arrondie à `decimales` chiffres,
 * au pair seulement en cas d'égalité exacte (0,685 vaut en réalité 0,68500000000000005 : il s'arrondit à 0,69).
 */
export function rond(x: number, decimales = 0): number {
  if (!Number.isFinite(x) || x === 0) return x;
  const vue = new DataView(new ArrayBuffer(8));
  vue.setFloat64(0, x);
  const hi = vue.getUint32(0), lo = vue.getUint32(4);
  const signe = hi >>> 31 ? -1n : 1n;
  const exposant = (hi >>> 20) & 0x7ff;
  let mantisse = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  let e: number;
  if (exposant === 0) e = -1074;
  else { mantisse |= 1n << 52n; e = exposant - 1075; }
  // |x| = mantisse × 2^e exactement.
  if (e >= 0) return x;
  const num = mantisse * 10n ** BigInt(decimales);
  const den = 1n << BigInt(-e);
  let q = num / den;
  const r2 = (num % den) * 2n;
  if (r2 > den || (r2 === den && q % 2n === 1n)) q += 1n;
  return Number(signe * q) / 10 ** decimales;
}
const fixe = (x: number, d: number) => rond(x, d).toFixed(d);
const virgule = (x: number) => fixe(x, 2).replace(".", ",");

export function joursDansMois(annee: number, mois: number): number {
  return new Date(Date.UTC(annee, mois, 0)).getUTCDate();
}

/** {"AAAA-M": valeur} sans les cumuls annuels (mois 13). */
export function lireSerie(brut: BrutPower, nom: string): Map<Cle, number> {
  const s = new Map<Cle, number>();
  for (const [cle, v] of Object.entries(brut.properties.parameter[nom] ?? {})) {
    const annee = Number(cle.slice(0, 4)), mois = Number(cle.slice(4));
    if (mois <= 12) s.set(`${annee}-${mois}`, v);
  }
  return s;
}

/** Moyenne par mois (janvier à décembre) ; valeurs manquantes ignorées ; un mois vide donne null. */
export function climatologie(serie: Map<Cle, number | null>): (number | null)[] {
  const sommes = Array(12).fill(0), comptes = Array(12).fill(0);
  for (const [cle, v] of serie) {
    if (v === null || v === MANQUANT) continue;
    const mois = Number(cle.split("-")[1]);
    sommes[mois - 1] += v;
    comptes[mois - 1] += 1;
  }
  return sommes.map((s, i) => (comptes[i] ? s / comptes[i] : null));
}

/** Toutes les saisons des pluies : suites de mois au-dessus de la moyenne (circulaire), gardées si ≥ 10 % de la pluie de l'année. */
export function saisonsDesPluies(pluie12: number[], partMin = 0.1): [number, number][] {
  const total = pluie12.reduce((a, b) => a + b, 0);
  if (total <= 0) return [];
  const moyenne = total / 12;
  const pluvieux = pluie12.map((v) => v >= moyenne);
  if (pluvieux.every(Boolean)) return [[1, 12]];
  const depart = pluvieux.findIndex((p) => !p) + 1;
  const saisons: [number, number][] = [];
  let i = 0;
  while (i < 12) {
    const idx = (depart + i) % 12;
    if (pluvieux[idx]) {
      let longueur = 0;
      while (i + longueur < 12 && pluvieux[(depart + i + longueur) % 12]) longueur++;
      let somme = 0;
      for (let k = 0; k < longueur; k++) somme += pluie12[(idx + k) % 12];
      if (somme >= partMin * total) saisons.push([idx + 1, ((idx + longueur - 1) % 12) + 1]);
      i += longueur;
    } else i++;
  }
  return saisons.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

export function mannKendall(serie: number[]): { s: number; z: number; tendance: "hausse" | "baisse" | "aucune" } {
  const n = serie.length;
  if (n < 8) return { s: 0, z: 0, tendance: "aucune" };
  let s = 0;
  for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) s += Math.sign(serie[j] - serie[i]);
  const variance = (n * (n - 1) * (2 * n + 5)) / 18;
  const z = s > 0 ? (s - 1) / Math.sqrt(variance) : s < 0 ? (s + 1) / Math.sqrt(variance) : 0;
  return { s, z, tendance: z > 1.96 ? "hausse" : z < -1.96 ? "baisse" : "aucune" };
}

export function niveau(valeur: number, minimum: number, maximum: number): number {
  if (maximum === minimum) return 0;
  return rond(((valeur - minimum) / (maximum - minimum)) * 4);
}

export function libelleSaisons(saisons: [number, number][]): string {
  return saisons.map(([d, f]) => (d === f ? MOIS_COURT[d - 1] : `${MOIS_COURT[d - 1]} → ${MOIS_COURT[f - 1]}`)).join(" · ");
}

const coord = (v: number, pos: string, neg: string) => `${fixe(Math.abs(v), 2).replace(".", ",")} ${v >= 0 ? pos : neg}`;
const indexMax = (t: number[]) => t.indexOf(Math.max(...t));
const indexMin = (t: number[]) => t.indexOf(Math.min(...t));

function alertes(pluie12: number[], chaleur12: number[], sol12: number[], saisons: [number, number][]): Climat["alertes"] {
  const a: Climat["alertes"] = [];
  const iChaud = indexMax(chaleur12);
  if (chaleur12[iChaud] >= 38) {
    a.push({ type: "surveiller", titre: `Forte chaleur en ${MOIS[iChaud]}`, texte: `La température maximale atteint ${fixe(chaleur12[iChaud], 0)} °C en moyenne en ${MOIS[iChaud]} : un sol nu y sèche très vite.` });
  }
  const iSec = indexMin(sol12);
  a.push({ type: "surveiller", titre: `Sol très sec en ${MOIS[iSec]}`, texte: `C'est le mois où le sol est le plus sec (indice ${virgule(sol12[iSec])}) : évitez de semer à ce moment.` });
  const iHum = indexMax(sol12);
  a.push({ type: "favorable", titre: `Fenêtre humide : ${MOIS[iHum]}`, texte: "Le sol est le plus humide : bonne période pour une légumineuse ou une culture de couverture." });
  if (saisons.length >= 2) a.push({ type: "favorable", titre: "Deux saisons des pluies", texte: "Une grande et une petite saison : deux cycles courts peuvent tenir dans l'année." });
  return a;
}

const texteDate = (d: Date) => `${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`;
const dateCle = (k: string) => new Date(Date.UTC(Number(k.slice(0, 4)), Number(k.slice(4, 6)) - 1, Number(k.slice(6, 8))));

/** Tuiles des 30 derniers jours publiés, comparés à la normale ; null s'il y a moins de 20 jours valides. */
export function etatDuMoment(brutJours: BrutPower, normales: { pluie: number[]; chaleur: number[]; sol: number[] }, saisons: [number, number][], aujourdhui: Date): Climat["actuel"] | null {
  const p = brutJours.properties.parameter;
  const cles = Object.keys(p.PRECTOTCORR ?? {}).sort().slice(-30);
  const valides = cles.filter((k) => ["PRECTOTCORR", "T2M_MAX", "GWETROOT"].every((n) => p[n]?.[k] !== undefined && p[n][k] !== MANQUANT));
  if (valides.length < 20) return null;
  const jours = valides.map(dateCle);
  const d1 = jours[0], d2 = jours[jours.length - 1];
  const pluie = valides.reduce((s, k) => s + p.PRECTOTCORR[k], 0);
  const chaleur = valides.reduce((s, k) => s + p.T2M_MAX[k], 0) / valides.length;
  const sol = valides.reduce((s, k) => s + p.GWETROOT[k], 0) / valides.length;
  const pluieNormale = jours.reduce((s, d) => s + normales.pluie[d.getUTCMonth()] / joursDansMois(d.getUTCFullYear(), d.getUTCMonth() + 1), 0);
  const nChaleur = jours.reduce((s, d) => s + normales.chaleur[d.getUTCMonth()], 0) / jours.length;
  const nSol = jours.reduce((s, d) => s + normales.sol[d.getUTCMonth()], 0) / jours.length;
  const nivPluie = pluie < 0.5 * pluieNormale ? "alerte" : pluie >= 0.9 * pluieNormale ? "ok" : "neutre";
  const nivChaleur = chaleur > nChaleur + 2 ? "alerte" : chaleur <= nChaleur ? "ok" : "neutre";
  const nivSol = sol < nSol - 0.05 ? "alerte" : sol >= nSol ? "ok" : "neutre";
  const mois = aujourdhui.getUTCMonth() + 1;
  const enCours = saisons.find(([d, f]) => d <= mois && mois <= f);
  let saison: string, titre: string, accent: string;
  if (enCours) [saison, titre, accent] = ["Saison des pluies", "Saison des pluies jusqu'en", MOIS[enCours[1] - 1]];
  else {
    const prochaine = saisons.length ? saisons.reduce((a, b) => (((b[0] - mois + 12) % 12) < ((a[0] - mois + 12) % 12) ? b : a)) : null;
    [saison, titre, accent] = ["Saison sèche", "Prochaines pluies vers", prochaine ? MOIS[prochaine[0] - 1] : "—"];
  }
  return {
    saison, titre, accent,
    texte: `Mesures NASA POWER du ${texteDate(d1)} au ${texteDate(d2)} (${valides.length} jours).`,
    moisCourant: mois,
    dateFin: d2.toISOString().slice(0, 10),
    tuiles: [
      { label: "Pluie (30 j)", valeur: `${fixe(pluie, 0)} mm`, source: `Normale ≈ ${fixe(pluieNormale, 0)} mm · NASA POWER`, niveau: nivPluie },
      { label: "Chaleur", valeur: `${fixe(chaleur, 0)} °C`, source: `Normale ${fixe(nChaleur, 0)} °C · NASA POWER`, niveau: nivChaleur },
      { label: "Humidité du sol", valeur: fixe(sol, 2).replace(".", ","), source: `Normale ${fixe(nSol, 2)} · NASA POWER`.replace(".", ","), niveau: nivSol },
    ],
    extras: [],
  };
}

/** Climat complet d'un lieu : mêmes champs que les fichiers data/regions/<id>.json. */
export function climatComplet(brutMensuel: BrutPower, brutJours: BrutPower | null, lieu: Lieu, aujourdhui: Date): Climat {
  const pluieJour = lireSerie(brutMensuel, "PRECTOTCORR");
  const pluieMois = new Map<Cle, number | null>();
  for (const [k, v] of pluieJour) {
    const [a, m] = k.split("-").map(Number);
    pluieMois.set(k, v !== MANQUANT ? v * joursDansMois(a, m) : null);
  }
  const pluie12 = climatologie(pluieMois).map((v) => rond(v ?? 0));
  const chaleur12 = climatologie(lireSerie(brutMensuel, "T2M_MAX")).map((v) => rond(v ?? 0, 1));
  const sol12 = climatologie(lireSerie(brutMensuel, "GWETROOT")).map((v) => rond(v ?? 0, 2));

  const saisonsBrutes = saisonsDesPluies(pluie12).filter(([d, f]) => d <= f);
  const saisons: [number, number][] = saisonsBrutes.length ? saisonsBrutes : [[1, 12]];
  const somme = (s: [number, number]) => { let t = 0; for (let m = s[0]; m <= s[1]; m++) t += pluie12[m - 1]; return t; };
  const principale = saisons.reduce((a, b) => (somme(b) > somme(a) ? b : a));
  const annees = [...new Set([...pluieMois.keys()].map((k) => Number(k.split("-")[0])))].sort((a, b) => a - b);
  const totaux = annees
    .filter((a) => Array.from({ length: 12 }, (_, i) => pluieMois.get(`${a}-${i + 1}`)).every((v) => v !== null && v !== undefined))
    .map((a) => Array.from({ length: 12 }, (_, i) => pluieMois.get(`${a}-${i + 1}`) as number).reduce((x, y) => x + y, 0));
  const tendance = mannKendall(totaux);
  const iPluie = indexMax(pluie12), iChaud = indexMax(chaleur12);
  const iSec = indexMin(sol12), iHum = indexMax(sol12);
  const tMin = Math.min(...chaleur12), tMax = Math.max(...chaleur12);
  const nb = saisons.length === 1 ? "Une seule saison" : `${saisons.length} saisons`;
  const phrase = { hausse: "en hausse", baisse: "en baisse", aucune: "sans tendance nette" }[tendance.tendance];
  const total = pluie12.reduce((a, b) => a + b, 0);

  return {
    indicateurs: [
      { label: "Saison des pluies", valeur: libelleSaisons(saisons), source: `${nb} · NASA POWER` },
      { label: "Pluie annuelle moyenne", valeur: `${total.toLocaleString("en-US").replace(/,/g, " ")} mm`, source: "NASA POWER" },
      { label: "Mois le plus chaud", valeur: `${MOIS[iChaud][0].toUpperCase()}${MOIS[iChaud].slice(1)} · ${fixe(chaleur12[iChaud], 0)} °C`, source: "Température max. · NASA POWER", accent: true },
      { label: "Sol le plus sec", valeur: `${MOIS[iSec][0].toUpperCase()}${MOIS[iSec].slice(1)} · ${virgule(sol12[iSec])}`, source: `Humidité du sol (0 à 1) · ${SOURCE_SOL}` },
    ],
    pluieMensuelle: pluie12,
    saisonPluies: { debut: principale[0], fin: principale[1] },
    saisons: saisons.map(([debut, fin]) => ({ debut, fin })),
    matrice: [
      { label: "Pluie", source: "NASA POWER", palette: "eau", valeurs: pluie12.map((v) => niveau(v, 0, Math.max(...pluie12))) },
      { label: "Chaleur", source: "NASA POWER", palette: "chaud", valeurs: chaleur12.map((v) => niveau(v, tMin, tMax)) },
      { label: "Humidité du sol", source: SOURCE_SOL, palette: "eau", valeurs: sol12.map((v) => niveau(v, Math.min(...sol12), Math.max(...sol12))) },
    ],
    alertes: alertes(pluie12, chaleur12, sol12, saisons),
    onglets: [
      {
        id: "pluie", label: "Pluie", big: `${pluie12[iPluie]} mm en ${MOIS[iPluie]}`, source: "NASA POWER", legende: "Pluie moyenne par mois", valeurs: pluie12, saison: true,
        conseil: saisons.length === 1
          ? `La pluie tombe surtout de ${MOIS[principale[0] - 1]} à ${MOIS[principale[1] - 1]} : c'est la fenêtre pour les cultures pluviales.`
          : "Deux saisons des pluies : une grande et une petite. Deux cultures courtes peuvent parfois tenir dans l'année.",
      },
      {
        id: "chaleur", label: "Chaleur", big: `${fixe(chaleur12[iChaud], 0)} °C en ${MOIS[iChaud]}`, source: "NASA POWER", legende: "Température maximale moyenne", valeurs: chaleur12, min: Math.floor(tMin) - 2,
        conseil: `C'est en ${MOIS[iChaud]} qu'il fait le plus chaud : un sol couvert garde mieux son humidité.`,
      },
      {
        id: "sol", label: "Sol", big: `Humide en ${MOIS[iHum]}`, source: SOURCE_SOL, legende: "Humidité de la zone racinaire (indice 0 à 1)", valeurs: sol12, min: Math.max(0, rond(Math.min(...sol12) - 0.05, 2)),
        conseil: `Le sol est le plus humide en ${MOIS[iHum]} et le plus sec en ${MOIS[iSec]} : semez quand l'humidité remonte, au début de la saison des pluies.`,
      },
    ],
    meta: {
      reel: ["pluie", "chaleur", "humidité du sol"],
      region: lieu.id,
      source: `NASA POWER, ${lieu.chefLieu} (${coord(lieu.lat, "N", "S")} · ${coord(lieu.lon, "E", "O")})`,
      periode: `${annees[0]}–${annees[annees.length - 1]}`,
      tendancePluie: `Pluie annuelle ${phrase} sur la période (test de Mann-Kendall, z = ${fixe(tendance.z, 2)}, ${totaux.length} années).`,
    },
    ...(brutJours ? (() => {
      const actuel = etatDuMoment(brutJours, { pluie: pluie12, chaleur: chaleur12, sol: sol12 }, saisons, aujourdhui);
      return actuel ? { actuel } : {};
    })() : {}),
  };
}
