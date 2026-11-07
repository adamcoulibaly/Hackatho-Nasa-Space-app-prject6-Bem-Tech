import fs from "node:fs/promises";
import path from "node:path";
import type { ZodType } from "zod";
import {
  ClimatSchema, RotationsSchema, CulturesSchema, type Culture, CouchesSchema, SourcesSchema, LexiqueSchema,
  type Climat, type Rotation, type Couche, type Sources, type Terme,
} from "@/lib/contract";

export class DataError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DataError";
  }
}

function dataDir(): string {
  return process.env.FOROSAT_DATA_DIR ?? path.resolve(process.cwd(), "..", "data", "pilot", "korhogo");
}

function regionsDir(): string {
  return process.env.FOROSAT_REGIONS_DIR ?? path.resolve(process.cwd(), "..", "data", "regions");
}

async function load<T>(name: string, schema: ZodType<T>, dir: string = dataDir()): Promise<T> {
  const file = path.join(dir, `${name}.json`);
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (cause) {
    throw new DataError(`Les données « ${name} » sont introuvables.`, { cause });
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (cause) {
    throw new DataError(`Les données « ${name} » sont illisibles.`, { cause });
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new DataError(`Les données « ${name} » ne respectent pas le contrat.`, { cause: result.error });
  }
  return result.data;
}

export const getClimat = (): Promise<Climat> => load("climat", ClimatSchema);
export const getRotations = (): Promise<Rotation[]> => load("rotations", RotationsSchema);
export const getCouches = (): Promise<Couche[]> => load("couches", CouchesSchema);
export const getSources = (): Promise<Sources> => load("sources", SourcesSchema);
export const getLexique = (): Promise<Terme[]> => load("lexique", LexiqueSchema);

export async function getRotation(id: string): Promise<Rotation | null> {
  const all = await getRotations();
  return all.find((r) => r.id === id) ?? null;
}

/** Climat réel (pluie, chaleur) d'une région, les autres indicateurs restant en exemple. */
export function getClimatRegion(id: string): Promise<Climat> {
  if (!/^[a-z-]+$/.test(id)) return Promise.reject(new DataError(`Région « ${id} » inconnue.`));
  return load(id, ClimatSchema, regionsDir());
}

/** Fiches des 8 cultures (knowledge/cultures.json). */
export function getCultures(): Promise<Culture[]> {
  const dir = process.env.FOROSAT_KNOWLEDGE_DIR ?? path.resolve(process.cwd(), "..", "knowledge");
  return load("cultures", CulturesSchema, dir);
}
