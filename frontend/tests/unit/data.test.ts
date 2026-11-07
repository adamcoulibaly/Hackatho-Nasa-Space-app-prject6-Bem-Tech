import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getClimat, getRotation, getRotations, getLexique, DataError } from "@/lib/data";

const withDir = async (setup: (dir: string) => void, fn: () => Promise<void>) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "forosat-"));
  setup(dir);
  process.env.FOROSAT_DATA_DIR = dir;
  try { await fn(); } finally { delete process.env.FOROSAT_DATA_DIR; fs.rmSync(dir, { recursive: true, force: true }); }
};

describe("data", () => {
  it("getRotation renvoie B, null pour une rotation inconnue", async () => {
    expect((await getRotation("B"))?.sequence).toEqual(["Maïs", "Arachide", "Coton"]);
    expect(await getRotation("Z")).toBeNull();
  });
  it("getLexique : 14 termes", async () => {
    expect(await getLexique()).toHaveLength(14);
  });
  it("fichier absent : DataError en français", async () => {
    await withDir(() => {}, async () => {
      const err = await getClimat().catch((e) => e);
      expect(err).toBeInstanceOf(DataError);
      expect(err.message).toMatch(/données/i);
      expect(err.message).toMatch(/climat/);
    });
  });
  it("JSON invalide (score 9) : DataError", async () => {
    const real = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../data/pilot/korhogo/rotations.json"), "utf8"));
    real[0].scores.fertilite = 9;
    await withDir((d) => fs.writeFileSync(path.join(d, "rotations.json"), JSON.stringify(real)), async () => {
      await expect(getRotations()).rejects.toBeInstanceOf(DataError);
    });
  });
  it("JSON illisible : DataError", async () => {
    await withDir((d) => fs.writeFileSync(path.join(d, "climat.json"), "{pas du json"), async () => {
      await expect(getClimat()).rejects.toBeInstanceOf(DataError);
    });
  });
});
