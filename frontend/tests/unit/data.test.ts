import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getClimat, getLexique, DataError } from "@/lib/data";

const withDir = async (setup: (dir: string) => void, fn: () => Promise<void>) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "forosat-"));
  setup(dir);
  process.env.FOROSAT_DATA_DIR = dir;
  process.env.FOROSAT_REGIONS_DIR = dir;
  try { await fn(); } finally { delete process.env.FOROSAT_DATA_DIR; delete process.env.FOROSAT_REGIONS_DIR; fs.rmSync(dir, { recursive: true, force: true }); }
};

describe("data", () => {
  it("getLexique : 20 termes", async () => {
    expect(await getLexique()).toHaveLength(20);
  });
  it("fichier absent : DataError en français", async () => {
    await withDir(() => {}, async () => {
      const err = await getClimat().catch((e) => e);
      expect(err).toBeInstanceOf(DataError);
      expect(err.message).toMatch(/données/i);
      expect(err.message).toMatch(/poro/);
    });
  });
  it("JSON qui ne respecte pas le contrat : DataError", async () => {
    await withDir((d) => fs.writeFileSync(path.join(d, "poro.json"), JSON.stringify({ pluieMensuelle: "beaucoup" })), async () => {
      await expect(getClimat()).rejects.toBeInstanceOf(DataError);
    });
  });
  it("JSON illisible : DataError", async () => {
    await withDir((d) => fs.writeFileSync(path.join(d, "poro.json"), "{pas du json"), async () => {
      await expect(getClimat()).rejects.toBeInstanceOf(DataError);
    });
  });
});
