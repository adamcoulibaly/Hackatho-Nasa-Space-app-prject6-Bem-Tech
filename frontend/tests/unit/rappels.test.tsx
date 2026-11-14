import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getCultures } from "@/lib/data";
import { planifierRappels } from "@/lib/rappels";
import { RappelsSaison } from "@/components/RappelsSaison";

async function mais() {
  return (await getCultures()).find((c) => c.nom === "Maïs")!;
}

describe("planifierRappels", () => {
  it("rappels datés de la saison : préparation, semis, sarclages, floraison, carnet, prix, récolte ; chacun ouvre une page", async () => {
    const r = planifierRappels(await mais(), "2026-05-28", "2026-04-01");
    const ids = r.map((x) => x.id);
    for (const id of ["preparation", "semis", "sarclage-1", "sarclage-2", "floraison", "recolte", "prix"]) expect(ids).toContain(id);
    expect(r.some((x) => x.id.startsWith("carnet-"))).toBe(true);
    expect(r.find((x) => x.id === "semis")).toMatchObject({ date: "2026-05-28", chemin: "/calendrier" });
    expect(r.find((x) => x.id === "sarclage-1")!.date).toBe("2026-06-18");
    expect(r.find((x) => x.id === "prix")!.chemin).toBe("/rotations");
    for (const x of r) {
      expect(x.titre).toMatch(/Maïs|maïs|ForoSat/);
      expect(x.texte.length).toBeGreaterThan(20);
    }
    // Dans l'ordre et sans doublon de date passée.
    expect([...r].sort((a, b) => a.date.localeCompare(b.date))).toEqual(r);
  });

  it("seuls les rappels à venir sont gardés, et pas plus de 20", async () => {
    const r = planifierRappels(await mais(), "2026-05-28", "2026-07-01");
    expect(r.every((x) => x.date > "2026-07-01")).toBe(true);
    expect(r.map((x) => x.id)).not.toContain("semis");
    expect(r.length).toBeLessThanOrEqual(20);
  });
});

describe("RappelsSaison (dans l'app)", () => {
  afterEach(() => {
    delete (window as any).ReactNativeWebView;
    sessionStorage.clear();
  });

  it("hors de l'app : rien ne s'affiche", async () => {
    const { container } = render(<RappelsSaison rappels={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("dans l'app : l'interrupteur envoie les rappels au téléphone, qui confirme", async () => {
    const posts: any[] = [];
    (window as any).ReactNativeWebView = { postMessage: (m: string) => posts.push(JSON.parse(m)) };
    sessionStorage.setItem("forosat.app", "1");
    const rappels = planifierRappels(await mais(), "2026-05-28", "2026-04-01");
    render(<RappelsSaison rappels={rappels} />);
    await userEvent.setup().click(screen.getByRole("switch", { name: /Rappels de saison/ }));
    expect(posts.at(-1)).toMatchObject({ type: "rappels", action: "activer" });
    expect(posts.at(-1).liste[0]).toMatchObject({ id: rappels[0].id, date: rappels[0].date, onglet: "tableau" });
    act(() => { document.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ type: "rappels", etat: "active", prochain: "2026-05-07" }) })); });
    expect(screen.getByRole("switch", { name: /Rappels de saison/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/Prochain rappel : 7 mai/)).toBeInTheDocument();
  });
});
