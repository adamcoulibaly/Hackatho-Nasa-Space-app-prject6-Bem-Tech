/**
 * Saisons réelles rejouées pour un point du monde (NASA POWER journalier), calculées à la demande.
 * Portage fidèle du pipeline Python (data/pipeline/saison.py, build_saisons.py) : même règle de semis
 * (Sivakumar, 1988), même bilan d'eau FAO-56, mêmes verdicts ; vérifié contre les fichiers ivoiriens.
 *
 * Ajout pour le monde : une culture de saison fraîche (blé, orge, pomme de terre…) ne se sème pas aux
 * premières pluies mais quand la chaleur retombe : le 1er du premier mois, après le plus chaud, dont la
 * température maximale moyenne passe sous son seuil (`semisFrais`). Si ce mois n'existe pas, il fait trop
 * chaud toute l'année pour elle, et la saison est dite perdue pour cette raison.
 */
import type { Culture, Saisons } from "@/lib/contract";
import { joursDansMois, rond, type BrutPower } from "./climat";

export const SEUIL_CUMUL_MM = 20;
const JOURS_CUMUL = 3;
const JOUR_SEC_MM = 1;
export const POCHE_SECHE_JOURS = 7;
const VERIF_JOURS = 20;
export const RESERVE_MM = 100;
const FRACTION_P = 0.5;
const MANQUANT_MAX = 0.1;

export type Serie = { debut: string; pluie: (number | null)[]; tmax: (number | null)[]; tmin: (number | null)[] };
type Verdict = Saisons["cultures"][string][number];
type CultureRejeu = Pick<Culture, "nom" | "cycleJours" | "stades"> & { semisFrais?: number };

const JOUR_MS = 86400000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const jourDeLAnnee = (d: Date) => Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / JOUR_MS) + 1;

/** Réponse POWER (journalier) → série ; -999 devient null. */
export function serieDepuisPower(brut: BrutPower): Serie {
  const p = brut.properties.parameter;
  const cles = Object.keys(p.PRECTOTCORR).sort();
  const val = (nom: string) => cles.map((k) => { const v = p[nom]?.[k]; return v === undefined || v === null || v <= -999 ? null : rond(v, 1); });
  const d = cles[0];
  return { debut: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, pluie: val("PRECTOTCORR"), tmax: val("T2M_MAX"), tmin: val("T2M_MIN") };
}

export function raMm(lat: number, jour: number): number {
  const phi = (lat * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * jour) / 365);
  const delta = 0.409 * Math.sin((2 * Math.PI * jour) / 365 - 1.39);
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(delta))));
  const ra = ((24 * 60) / Math.PI) * 0.082 * dr * (ws * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(ws));
  return ra * 0.408;
}

export const et0Hargreaves = (tmax: number, tmin: number, ra: number) => 0.0023 * ra * ((tmax + tmin) / 2 + 17.8) * Math.sqrt(Math.max(0, tmax - tmin));
const sec = (v: number | null) => v === null || v < JOUR_SEC_MM;

export function plusLonguePoche(pluie: (number | null)[]): number {
  let meilleur = 0, courant = 0;
  for (const v of pluie) { courant = sec(v) ? courant + 1 : 0; meilleur = Math.max(meilleur, courant); }
  return meilleur;
}

export function dateSemis(pluie: (number | null)[], iDebut: number, iFin: number): number | null {
  for (let i = Math.max(iDebut, JOURS_CUMUL - 1); i <= Math.min(iFin, pluie.length - 1); i++) {
    let cumul = 0;
    for (let k = i - JOURS_CUMUL + 1; k <= i; k++) cumul += pluie[k] ?? 0;
    if (cumul < SEUIL_CUMUL_MM) continue;
    const suite = pluie.slice(i + 1, i + 1 + VERIF_JOURS);
    if (suite.length < VERIF_JOURS) return null;
    if (plusLonguePoche(suite) < POCHE_SECHE_JOURS) return i;
  }
  return null;
}

export function stadesJours(c: CultureRejeu): number[] {
  const ref = c.stades.jours, total = c.cycleJours, somme = ref.reduce((a, b) => a + b, 0);
  const d = ref.slice(0, 3).map((x) => rond((x * total) / somme));
  return [...d, total - d.reduce((a, b) => a + b, 0)];
}

function kcJour(jour: number, stades: number[], kc: number[]): number {
  const [ini, dev, mid] = stades;
  const [kIni, kMid, kFin] = kc;
  if (jour < ini) return kIni;
  if (jour < ini + dev) return kIni + ((kMid - kIni) * (jour - ini + 1)) / dev;
  if (jour < ini + dev + mid) return kMid;
  const late = stades.reduce((a, b) => a + b, 0) - ini - dev - mid;
  return kMid + ((kFin - kMid) * (jour - ini - dev - mid + 1)) / Math.max(1, late);
}

function complete(v: (number | null)[]): number[] {
  const ok = v.filter((x): x is number => x !== null);
  const moy = ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : 0;
  return v.map((x) => (x === null ? moy : x));
}

export function bilan(s: Serie, lat: number, iSemis: number, c: CultureRejeu, reserve = RESERVE_MM): { ratio: number; pocheFloraison: number; pocheMax: number } | null {
  const stades = stadesJours(c);
  const n = stades.reduce((a, b) => a + b, 0);
  const fin = iSemis + n;
  if (fin > s.pluie.length) return null;
  const p = s.pluie.slice(iSemis, fin), tx = s.tmax.slice(iSemis, fin), tn = s.tmin.slice(iSemis, fin);
  let manquants = 0;
  for (let k = 0; k < n; k++) if (p[k] === null || tx[k] === null || tn[k] === null) manquants++;
  if (manquants > MANQUANT_MAX * n) return null;
  const txc = complete(tx), tnc = complete(tn);
  const debutMid = stades[0] + stades[1], finMid = debutMid + stades[2];
  const jour0 = Date.parse(`${s.debut}T00:00:00Z`);
  let epuise = reserve / 2, etaP = 0, etcP = 0;
  for (let k = 0; k < n; k++) {
    const j = jourDeLAnnee(new Date(jour0 + (iSemis + k) * JOUR_MS));
    const etc = kcJour(k, stades, c.stades.kc) * et0Hargreaves(txc[k], tnc[k], raMm(lat, j));
    const seuil = FRACTION_P * reserve;
    const ks = epuise <= seuil ? 1 : Math.max(0, (reserve - epuise) / (reserve - seuil));
    const eta = ks * etc;
    epuise = Math.min(reserve, Math.max(0, epuise - (p[k] ?? 0) + eta));
    const poids = debutMid <= k && k < finMid ? 2 : 1;
    etaP += poids * eta;
    etcP += poids * etc;
  }
  return { ratio: etcP ? rond(etaP / etcP, 3) : 1, pocheFloraison: plusLonguePoche(p.slice(debutMid, finMid)), pocheMax: plusLonguePoche(p) };
}

const de = (nom: string) => { const n = nom.toLowerCase(); return "aeiouyéèêàâîïôûh".includes(n[0]) ? `de l'${n}` : `du ${n}`; };

/** Mois de semis d'une culture de saison fraîche, ou null s'il fait trop chaud toute l'année. */
export function moisSemisFrais(tmax12: number[], seuil: number): number | null {
  const chaud = tmax12.indexOf(Math.max(...tmax12));
  for (let k = 1; k <= 12; k++) {
    const m = (chaud + k) % 12;
    if (tmax12[m] <= seuil) return m + 1;
  }
  return null;
}

/** Température maximale moyenne de chaque mois, tirée de la série journalière. */
export function tmaxMensuelle(s: Serie): number[] {
  const somme = Array(12).fill(0), compte = Array(12).fill(0);
  const jour0 = Date.parse(`${s.debut}T00:00:00Z`);
  s.tmax.forEach((v, i) => { if (v === null) return; const m = new Date(jour0 + i * JOUR_MS).getUTCMonth(); somme[m] += v; compte[m]++; });
  return somme.map((x, m) => (compte[m] ? x / compte[m] : 0));
}

/** Verdict d'une saison pour une culture, ou null si les données ne permettent pas de juger. */
export function verdictSaison(s: Serie, lat: number, annee: number, saison: { debut: number; fin: number }, c: CultureRejeu, tmax12?: number[]): Verdict | null {
  const jour0 = Date.parse(`${s.debut}T00:00:00Z`);
  const indice = (a: number, m: number, j: number) => Math.round((Date.UTC(a, m - 1, j) - jour0) / JOUR_MS);
  if (c.semisFrais !== undefined) {
    const m = moisSemisFrais(tmax12 ?? tmaxMensuelle(s), c.semisFrais);
    if (m === null) return { annee, verdict: "perdue", semis: null, ratio: null, cause: "trop chaud toute l'année pour cette culture" };
    const i = indice(annee, m, 1);
    if (i < 0 || i >= s.pluie.length) return null;
    return conclure(s, lat, annee, i, c);
  }
  const moisFin = Math.min(12, saison.debut + 2);
  const iDebut = indice(annee, saison.debut, 1);
  const iFin = indice(annee, moisFin, joursDansMois(annee, moisFin));
  if (iDebut < 0 || iFin + VERIF_JOURS >= s.pluie.length) return null;
  const fenetre = s.pluie.slice(iDebut, iFin + 1);
  if (fenetre.filter((v) => v === null).length > MANQUANT_MAX * fenetre.length) return null;
  const i = dateSemis(s.pluie, iDebut, iFin);
  if (i === null) return { annee, verdict: "perdue", semis: null, ratio: null, cause: "pas assez de pluie pour semer" };
  return conclure(s, lat, annee, i, c);
}

function conclure(s: Serie, lat: number, annee: number, i: number, c: CultureRejeu): Verdict | null {
  const b = bilan(s, lat, i, c);
  if (!b) return null;
  const r = b.ratio;
  const verdict = r >= 0.75 ? "bonne" : r >= 0.5 ? "difficile" : "perdue";
  const cause = b.pocheFloraison >= POCHE_SECHE_JOURS
    ? `${b.pocheFloraison} jours secs pendant la floraison ${de(c.nom)}`
    : verdict === "bonne" ? "eau suffisante tout le cycle" : "pluie insuffisante sur le cycle";
  return { annee, verdict, semis: iso(new Date(Date.parse(`${s.debut}T00:00:00Z`) + i * JOUR_MS)), ratio: rond(r, 2), cause };
}

/** Pluie cumulée (mm) de la saison principale, par année. */
export function pluieParSaison(s: Serie, saison: { debut: number; fin: number }, annees: number[]): Record<string, number> {
  const jour0 = Date.parse(`${s.debut}T00:00:00Z`);
  const out: Record<string, number> = {};
  for (const a of annees) {
    const i0 = Math.round((Date.UTC(a, saison.debut - 1, 1) - jour0) / JOUR_MS);
    const i1 = Math.round((Date.UTC(a, saison.fin - 1, joursDansMois(a, saison.fin)) - jour0) / JOUR_MS);
    if (i0 < 0 || i1 >= s.pluie.length) continue;
    let t = 0;
    for (let i = i0; i <= i1; i++) t += s.pluie[i] ?? 0;
    out[String(a)] = rond(t, 1);
  }
  return out;
}

/** Saisons rejouées d'un lieu, au format de data/saisons/<id>.json. */
export function saisonsLieu(s: Serie, lat: number, region: string, saison: { debut: number; fin: number }, cultures: CultureRejeu[], annees: number[]): Saisons {
  const tmax12 = tmaxMensuelle(s);
  const table: Saisons["cultures"] = {};
  for (const c of cultures) table[c.nom] = annees.map((a) => verdictSaison(s, lat, a, saison, c, tmax12)).filter((v): v is Verdict => v !== null);
  return {
    meta: { region, source: "NASA POWER (journalier)", periode: `${annees[0]}–${annees[annees.length - 1]}`, saison, reserveMm: RESERVE_MM, pluieSaison: pluieParSaison(s, saison, annees) },
    cultures: table,
  };
}
