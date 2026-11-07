import type { Couche } from "@/lib/contract";

export const MOSAIC_COLS = 36;
export const MOSAIC_ROWS = 20;

/** Mosaïque simulée de la couche pour une année (valeurs d'exemple, déterministe). */
export function mosaic(couche: Couche, year: number): string[] {
  const { palette, motif } = couche;
  const yr = (year - 2015) * 0.04;
  const out: string[] = [];
  for (let y = 0; y < MOSAIC_ROWS; y++) {
    for (let x = 0; x < MOSAIC_COLS; x++) {
      const n = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
      let v = 0.45 + 0.3 * Math.sin(x * motif.fx + y * motif.fy + yr) + 0.2 * Math.cos(y * 0.7 - x * 0.15) + (n - 0.5) * 0.4;
      v = Math.min(0.999, Math.max(0, v));
      out.push(palette[Math.floor(v * palette.length)]);
    }
  }
  return out;
}
