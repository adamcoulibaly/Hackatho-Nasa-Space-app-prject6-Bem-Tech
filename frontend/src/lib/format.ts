export type ScoreWord = "Faible" | "Moyen" | "Bon" | "Très bon";

export function scoreWord(level: number): ScoreWord {
  if (level >= 5) return "Très bon";
  if (level === 4) return "Bon";
  if (level === 3) return "Moyen";
  return "Faible";
}

/** Cinq segments de jauge : remplis jusqu'au niveau, vides ensuite. */
export function scoreSegments(level: number, dark: boolean): string[] {
  const fill = level >= 4 ? (dark ? "#009E60" : "#00703C") : level === 3 ? "#F77F00" : dark ? "#F4F6F1" : "#07120D";
  const empty = dark ? "#1F3328" : "#DDE3DC";
  return [1, 2, 3, 4, 5].map((i) => (i <= level ? fill : empty));
}

export function barHeight(value: number, max: number, px: number): number {
  return Math.max(4, Math.round((value / max) * px));
}

const GRACE_PX_PER_UNIT = 12;

export function graceBar(entry: { annee: number; ecart: number | null }, pxParUnite: number = GRACE_PX_PER_UNIT): { up: number; down: number; gap: boolean } {
  if (entry.ecart === null) return { up: 0, down: 0, gap: true };
  return {
    up: entry.ecart > 0 ? entry.ecart * pxParUnite : 0,
    down: entry.ecart < 0 ? -entry.ecart * pxParUnite : 0,
    gap: false,
  };
}
