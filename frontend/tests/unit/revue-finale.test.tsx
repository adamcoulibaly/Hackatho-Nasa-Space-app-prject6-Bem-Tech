import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { calculerRotations, rotationConseillee } from "@/lib/moteur/rotations";
import { useClimatRegion } from "@/lib/useClimatRegion";
import { saisonDuMoment, mesuresRecentes } from "@/lib/saison";
import { DemandeSchema, rotationDepuisDemande } from "@/lib/ia/assistant";
import { lienFiche } from "@/lib/moteur/fiche-lien";
import { ecouterNatif } from "@/lib/modeApp";
import { ParcelleProvider } from "@/lib/parcelle/context";
import { ParcelleForm } from "@/components/ParcelleForm";
import { RotationsVue } from "@/components/RotationsVue";
import { DEFAULT_PARCELLE, validateParcelle } from "@/lib/parcelle/validate";
import { CULTURES_FICHES, lireClimat, rotations } from "../helpers/moteur";

const korhogo = lireClimat("poro");
const ensemble = (s: string[]) => [...s].sort().join(",");

describe("1 : les alternatives ne sont jamais la rotation actuelle réordonnée", () => {
  it("B et C n'ont pas le même ensemble de cultures que A", () => {
    for (const cultures of [["Manioc", "Sorgho", "Niébé"], ["Maïs", "Coton", "Niébé"], ["Arachide", "Coton", "Maïs"]]) {
      for (const region of ["poro", "abidjan"]) {
        const r = calculerRotations({ ...DEFAULT_PARCELLE, cultures }, lireClimat(region), CULTURES_FICHES)!;
        expect(ensemble(r[1].sequence)).not.toBe(ensemble(cultures));
        expect(ensemble(r[2].sequence)).not.toBe(ensemble(cultures));
      }
    }
  });
  it("sans rotation recommandée, la rotation conseillée est l'actuelle", () => {
    const r = rotations();
    const sans = r.map((x) => ({ ...x, recommandee: false }));
    expect(rotationConseillee(sans)).toBe(sans[0]);
    expect(rotationConseillee(r)).toBe(r.find((x) => x.recommandee) ?? r[0]);
  });
});

describe("2 et 3 : climat d'une autre région", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("n'affiche jamais le climat d'une autre région pendant le chargement", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const { result } = renderHook(() => useClimatRegion(korhogo, "gbeke"));
    expect(result.current.statut).toBe("chargement");
  });
  it("après une erreur, « Réessayer » relance le chargement", async () => {
    const gbeke = lireClimat("gbeke");
    const f = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 500 })).mockResolvedValueOnce(new Response(JSON.stringify(gbeke), { status: 200 }));
    vi.stubGlobal("fetch", f);
    localStorage.setItem("forosat.parcelle", JSON.stringify({ parcelle: { ...DEFAULT_PARCELLE, region: "gbeke" }, saisie: true }));
    render(<ParcelleProvider><RotationsVue initial={korhogo} cultures={CULTURES_FICHES} /></ParcelleProvider>);
    await userEvent.setup().click(await screen.findByRole("button", { name: "Réessayer" }));
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(3));
    expect(f).toHaveBeenCalledTimes(2);
    localStorage.clear();
  });
});

describe("4 : l'assistant IA recalcule la rotation côté serveur", () => {
  const p = { ...DEFAULT_PARCELLE, cultures: ["Maïs", "Coton"] };
  it("la demande ne transporte que l'identifiant, les paramètres de parcelle et la question", () => {
    const params = lienFiche("B", p).split("?")[1];
    expect(DemandeSchema.safeParse({ id: "B", params }).success).toBe(true);
    expect(DemandeSchema.safeParse({ id: "B", params: "x".repeat(600) }).success).toBe(false);
    expect(DemandeSchema.safeParse({ id: "B", params, rotation: { note: "x".repeat(100000) } }).success).toBe(true); // champ inconnu ignoré
  });
  it("la rotation est recalculée par le moteur à partir des paramètres", () => {
    const params = lienFiche("B", p).split("?")[1];
    const r = rotationDepuisDemande({ id: "B", params }, { climat: korhogo, cultures: CULTURES_FICHES });
    expect(r?.sequence).toEqual(rotations({ cultures: ["Maïs", "Coton"] })[1].sequence);
    expect(rotationDepuisDemande({ id: "B", params: "r=poro" }, { climat: korhogo, cultures: CULTURES_FICHES })).toBeNull();
  });
});

describe("6 : la saison affichée suit la date du jour", () => {
  it("saison sèche ou des pluies selon le mois courant", () => {
    expect(saisonDuMoment([{ debut: 5, fin: 10 }], 11)).toEqual({ saison: "Saison sèche", titre: "Prochaines pluies vers", accent: "mai" });
    expect(saisonDuMoment([{ debut: 5, fin: 10 }], 6)).toEqual({ saison: "Saison des pluies", titre: "Saison des pluies jusqu'en", accent: "octobre" });
    expect(saisonDuMoment([{ debut: 3, fin: 6 }, { debut: 10, fin: 10 }], 8)).toEqual({ saison: "Saison sèche", titre: "Prochaines pluies vers", accent: "octobre" });
  });
  it("des mesures de plus de 45 jours ne sont plus « du moment »", () => {
    expect(mesuresRecentes("2026-11-04", new Date("2026-11-08"))).toBe(true);
    expect(mesuresRecentes("2026-09-01", new Date("2026-11-08"))).toBe(false);
    expect(mesuresRecentes(undefined, new Date("2026-11-08"))).toBe(false);
  });
});

describe("7 : un refus de GPS dans l'app est transmis à la carte", () => {
  it("ecouterNatif transmet aussi les erreurs de position", () => {
    const recu = vi.fn();
    const arreter = ecouterNatif(recu);
    window.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ type: "position", erreur: "refus" }) }));
    expect(recu).toHaveBeenCalledWith({ type: "position", erreur: "refus" });
    arreter();
  });
});

describe("8 : 3 cultures au plus", () => {
  afterEach(() => localStorage.clear());
  it("une 4e culture n'est pas ajoutée et un message l'explique", async () => {
    const user = userEvent.setup();
    render(<ParcelleProvider><ParcelleForm onSubmit={() => {}} /></ParcelleProvider>);
    await user.click(await screen.findByRole("button", { name: "Igname" }));
    await user.click(screen.getByRole("button", { name: "Manioc" }));
    expect(screen.getByRole("button", { name: "Manioc" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("3 cultures au plus : retirez-en une pour en choisir une autre.")).toBeInTheDocument();
  });
  it("une parcelle de 4 cultures est refusée par la validation", () => {
    expect(validateParcelle({ ...DEFAULT_PARCELLE, cultures: ["Maïs", "Coton", "Igname", "Manioc"] }).erreurs).toContain("Choisissez 3 cultures au plus.");
  });
});
