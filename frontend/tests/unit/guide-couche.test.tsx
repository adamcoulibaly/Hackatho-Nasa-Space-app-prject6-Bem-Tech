import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { CouchesSchema } from "@/lib/contract";
import { GuideCouche } from "@/components/GuideCouche";

const couches = CouchesSchema.parse(JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../data/pilot/korhogo/couches.json"), "utf8")));

describe("GuideCouche", () => {
  it("chaque couche NASA explique ce qu'elle mesure, sa finesse, ses couleurs et ce que ça veut dire pour le champ", () => {
    for (const c of couches.filter((x) => x.id !== "couleurs")) {
      expect(c.guide?.mesure.length).toBeGreaterThan(20);
      expect(c.guide?.finesse).toMatch(/km/);
      expect(c.guide?.lecture.length).toBeGreaterThanOrEqual(3);
      expect(c.guide?.pourVotreChamp.length).toBeGreaterThan(20);
    }
  });

  it("affiche le guide de la couche choisie", () => {
    render(<GuideCouche couche={couches.find((c) => c.id === "sol")!} />);
    expect(screen.getByText("Ce que mesure cette couche")).toBeInTheDocument();
    expect(screen.getByText(/zone des racines/)).toBeInTheDocument();
    expect(screen.getByText(/9 km/)).toBeInTheDocument();
    expect(screen.getByText(/sol sec/)).toBeInTheDocument();
    expect(screen.getByText("Pour votre champ")).toBeInTheDocument();
  });
});
