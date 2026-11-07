import { mosaic } from "@/lib/mosaic";
import { CouchesSchema } from "@/lib/contract";
import fs from "node:fs";
import path from "node:path";

const couches = CouchesSchema.parse(JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../data/pilot/korhogo/couches.json"), "utf8")));

describe("mosaic", () => {
  it("produit 36 × 20 = 720 couleurs de la palette", () => {
    const m = mosaic(couches[0], 2025);
    expect(m).toHaveLength(720);
    for (const c of m) expect(couches[0].palette).toContain(c);
  });
  it("est déterministe", () => {
    expect(mosaic(couches[1], 2010)).toEqual(mosaic(couches[1], 2010));
  });
  it("change avec l'année", () => {
    expect(mosaic(couches[0], 2005)).not.toEqual(mosaic(couches[0], 2025));
  });
});
