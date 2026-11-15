import { act, fireEvent, render, screen } from "@testing-library/react";
import { GuidePasAPas } from "@/components/GuidePasAPas";
import {
  CLE_GUIDE, ETAPES, NB_ETAPES, cheminCorrespond, demarrageAuto, demarrerGuide, etapeSuivante, lireEtatGuide, placerBulle, signalerGuide,
} from "@/lib/guide";

let chemin = "/parcelle";
let saisie = false;
vi.mock("next/navigation", () => ({ usePathname: () => chemin, useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/parcelle/context", () => ({ useParcelle: () => ({ saisie, pret: true }) }));

const etatStocke = () => JSON.parse(localStorage.getItem(CLE_GUIDE) ?? "null");
const zone = (guide: string) => {
  const el = document.createElement("button");
  el.dataset.guide = guide;
  el.textContent = guide;
  el.getBoundingClientRect = () => ({ top: 100, left: 40, width: 200, height: 48, right: 240, bottom: 148, x: 40, y: 100, toJSON: () => ({}) });
  document.body.appendChild(el);
  return el;
};
const image = () => act(async () => { await new Promise((r) => setTimeout(r, 40)); });

describe("guide pas à pas : logique", () => {
  it("reconnaît les pages d'une étape, préfixe compris", () => {
    expect(cheminCorrespond("/parcelle", "/parcelle/")).toBe(true);
    expect(cheminCorrespond("/parcelle", "/parcelle?app=1")).toBe(true);
    expect(cheminCorrespond("/rotations/*", "/rotations/B")).toBe(true);
    expect(cheminCorrespond("/rotations/*", "/rotations")).toBe(false);
    expect(cheminCorrespond("/rotations", "/rotations/B")).toBe(false);
  });

  it("avance d'une étape puis se termine après la dernière", () => {
    expect(etapeSuivante({ etape: 2, statut: "en-cours" })).toEqual({ etape: 3, statut: "en-cours" });
    expect(etapeSuivante({ etape: ETAPES.length - 1, statut: "en-cours" }).statut).toBe("termine");
  });

  it("ne démarre seul que pour un nouveau venu", () => {
    expect(demarrageAuto(null, false)).toBe(true);
    expect(demarrageAuto(null, true)).toBe(false);
    expect(demarrageAuto({ etape: 0, statut: "ferme" }, false)).toBe(false);
  });

  it("ignore un état stocké abîmé", () => {
    const stockage = (v: string) => ({ getItem: () => v });
    expect(lireEtatGuide(stockage("{pas du json"))).toBeNull();
    expect(lireEtatGuide(stockage(JSON.stringify({ etape: 999, statut: "en-cours" })))).toBeNull();
    expect(lireEtatGuide(stockage(JSON.stringify({ etape: 1, statut: "autre" })))).toBeNull();
    expect(lireEtatGuide(stockage(JSON.stringify({ etape: 1, statut: "en-cours" })))).toEqual({ etape: 1, statut: "en-cours" });
  });

  it("place la bulle sous la zone, sinon au-dessus, sinon en bas, toujours dans l'écran", () => {
    const vue = { width: 400, height: 800 };
    const bulle = { width: 360, height: 200 };
    expect(placerBulle({ top: 100, left: 0, width: 100, height: 50 }, bulle, vue)).toMatchObject({ cote: "dessous", top: 164, left: 16 });
    expect(placerBulle({ top: 600, left: 300, width: 100, height: 50 }, bulle, vue)).toMatchObject({ cote: "dessus", left: 24 });
    // Zone trop haute : la bulle se cale là où elle en cache le moins.
    expect(placerBulle({ top: 100, left: 0, width: 400, height: 650 }, bulle, vue)).toMatchObject({ cote: "haut", top: 16 });
    expect(placerBulle({ top: 40, left: 0, width: 400, height: 600 }, bulle, vue)).toMatchObject({ cote: "bas", top: 584 });
    // À côté de la zone quand l'écran est large.
    expect(placerBulle({ top: 50, left: 100, width: 400, height: 700 }, bulle, { width: 1280, height: 800 })).toMatchObject({ cote: "droite", top: 50, left: 514 });
    expect(placerBulle({ top: 50, left: 800, width: 400, height: 700 }, bulle, { width: 1280, height: 800 })).toMatchObject({ cote: "gauche", left: 426 });
    expect(placerBulle(null, bulle, vue, 16, 14, 90)).toMatchObject({ cote: "bas", top: 494, left: 20 });
  });

  it("chaque étape cliquable ou montrée désigne une zone, et le compte exclut l'accueil", () => {
    expect(NB_ETAPES).toBe(ETAPES.length - 1);
    for (const e of ETAPES.slice(1)) expect(e.cible).toBeTruthy();
    for (const e of ETAPES.filter((x) => x.avance === "evenement")) expect(e.evenement).toBeTruthy();
    expect(new Set(ETAPES.map((e) => e.id)).size).toBe(ETAPES.length);
  });
});

describe("guide pas à pas : affichage", () => {
  beforeEach(() => {
    localStorage.clear();
    chemin = "/parcelle";
    saisie = false;
  });
  afterEach(() => {
    document.querySelectorAll("[data-guide]").forEach((e) => e.remove());
  });

  it("accueille un nouveau venu sur la page du champ, puis montre où toucher", async () => {
    render(<GuidePasAPas />);
    expect(await screen.findByRole("dialog", { name: "Bienvenue sur ForoSat" })).toBeInTheDocument();
    zone("lieu");
    const position = zone("position");
    fireEvent.click(screen.getByRole("button", { name: "C'est parti" }));
    expect(etatStocke()).toEqual({ etape: 1, statut: "en-cours" });
    await image();
    expect(screen.getByRole("dialog", { name: "Situez votre champ" })).toBeInTheDocument();
    expect(screen.getByTestId("guide-zone")).toBeInTheDocument();
    expect(screen.getByText(`Étape 1 sur ${NB_ETAPES}`)).toBeInTheDocument();
    // Toucher la zone indiquée passe à l'étape suivante.
    zone("dessiner");
    fireEvent.click(position);
    expect(await screen.findByRole("dialog", { name: "Dessinez votre champ" })).toBeInTheDocument();
  });

  it("« Plus tard » ferme le guide pour de bon", async () => {
    render(<GuidePasAPas />);
    fireEvent.click(await screen.findByRole("button", { name: "Plus tard" }));
    expect(etatStocke()).toEqual({ etape: 0, statut: "ferme" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("ne démarre pas seul quand une parcelle est déjà analysée", async () => {
    saisie = true;
    render(<GuidePasAPas />);
    await image();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("l'analyse de la parcelle termine l'étape qui l'attend", async () => {
    localStorage.setItem(CLE_GUIDE, JSON.stringify({ etape: ETAPES.findIndex((e) => e.id === "analyser"), statut: "en-cours" }));
    zone("analyser");
    render(<GuidePasAPas />);
    expect(await screen.findByRole("dialog", { name: "Lancez l'analyse" })).toBeInTheDocument();
    act(() => signalerGuide("parcelle-analysee"));
    expect(etatStocke().etape).toBe(ETAPES.findIndex((e) => e.id === "rotations"));
  });

  it("sur une autre page, propose de reprendre l'étape en cours", async () => {
    chemin = "/climat";
    localStorage.setItem(CLE_GUIDE, JSON.stringify({ etape: ETAPES.findIndex((e) => e.id === "simuler"), statut: "en-cours" }));
    render(<GuidePasAPas />);
    const barre = await screen.findByTestId("guide-reprise");
    expect(barre).toHaveTextContent("Testez avant de semer");
    expect(screen.getByRole("link", { name: "Continuer" })).toHaveAttribute("href", "/simulateur");
    fireEvent.click(screen.getByRole("button", { name: "Quitter le guide" }));
    expect(etatStocke().statut).toBe("ferme");
  });

  it("la dernière étape se termine par « Terminer », et Échap quitte", async () => {
    chemin = "/tableau";
    zone("raccourcis");
    localStorage.setItem(CLE_GUIDE, JSON.stringify({ etape: ETAPES.length - 1, statut: "en-cours" }));
    render(<GuidePasAPas />);
    fireEvent.click(await screen.findByRole("button", { name: "Terminer" }));
    expect(etatStocke().statut).toBe("termine");

    demarrerGuide();
    chemin = "/parcelle";
    zone("lieu");
    render(<GuidePasAPas />);
    expect(await screen.findAllByRole("dialog", { name: "Situez votre champ" })).not.toHaveLength(0);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(etatStocke().statut).toBe("ferme");
  });
});
