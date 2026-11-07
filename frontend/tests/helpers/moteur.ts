import fs from "node:fs";
import path from "node:path";
import { ClimatSchema, CulturesSchema, type Climat } from "@/lib/contract";
import { DEFAULT_PARCELLE, type Parcelle } from "@/lib/parcelle/validate";
import { calculerRotations, type RotationCalculee } from "@/lib/moteur/rotations";

const RACINE = path.resolve(__dirname, "../../../");
export const lireClimat = (region = "poro"): Climat =>
  ClimatSchema.parse(JSON.parse(fs.readFileSync(path.join(RACINE, "data/regions", `${region}.json`), "utf8")));
export const CULTURES_FICHES = CulturesSchema.parse(JSON.parse(fs.readFileSync(path.join(RACINE, "knowledge/cultures.json"), "utf8")));

/** Rotations calculées par le moteur pour une parcelle (Korhogo par défaut). */
export function rotations(p: Partial<Parcelle> = {}, region = "poro"): RotationCalculee[] {
  return calculerRotations({ ...DEFAULT_PARCELLE, region, ...p }, lireClimat(region), CULTURES_FICHES)!;
}
