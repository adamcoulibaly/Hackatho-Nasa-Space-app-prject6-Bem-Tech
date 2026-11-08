import { act, render, renderHook, waitFor, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { ParcelleProvider, useParcelle } from "@/lib/parcelle/context";
import { ecouterNatif, envoyerParcelle, ongletDe, ouvrirDansApp } from "@/lib/modeApp";
import { ModeApp } from "@/components/ModeApp";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => window.location.pathname }));

const wrapper = ({ children }: { children: ReactNode }) => <ParcelleProvider>{children}</ParcelleProvider>;
const stocker = (cultures: string[]) =>
  localStorage.setItem(
    "forosat.parcelle",
    JSON.stringify({ parcelle: { region: "poro", surface: 2, cultures, eau: "pluie", priorites: ["Garder un bon revenu"], materiel: "traction" }, saisie: true }),
  );
const duNatif = (m: object) => window.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(m) }));

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  push.mockReset();
  window.history.pushState({}, "", "/");
  document.documentElement.classList.remove("mode-app");
  delete (window as any).ReactNativeWebView;
});

describe("synchronisation de la parcelle entre onglets de l'app", () => {
  it("relit la parcelle quand un autre onglet l'a changée (signal forosat:sync)", async () => {
    const { result } = renderHook(() => useParcelle(), { wrapper });
    await waitFor(() => expect(result.current.pret).toBe(true));
    expect(result.current.saisie).toBe(false);
    stocker(["Maïs", "Arachide"]);
    act(() => {
      window.dispatchEvent(new Event("forosat:sync"));
    });
    expect(result.current.saisie).toBe(true);
    expect(result.current.parcelle.cultures).toEqual(["Maïs", "Arachide"]);
  });

  it("relit aussi la parcelle sur l'événement storage et au retour sur la page", async () => {
    const { result } = renderHook(() => useParcelle(), { wrapper });
    await waitFor(() => expect(result.current.pret).toBe(true));
    stocker(["Riz"]);
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "forosat.parcelle" }));
    });
    expect(result.current.parcelle.cultures).toEqual(["Riz"]);
    stocker(["Sorgho"]);
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(result.current.parcelle.cultures).toEqual(["Sorgho"]);
  });

  it("le message natif « sync » déclenche la relecture", async () => {
    window.history.pushState({}, "", "/rotations?app=1");
    render(<ModeApp />);
    const { result } = renderHook(() => useParcelle(), { wrapper });
    await waitFor(() => expect(result.current.pret).toBe(true));
    stocker(["Niébé"]);
    act(() => duNatif({ type: "sync" }));
    expect(result.current.parcelle.cultures).toEqual(["Niébé"]);
  });
});

describe("navigation entre onglets de l'app", () => {
  it("chaque page connaît son onglet natif", () => {
    expect(ongletDe("/parcelle")).toBe("champ");
    expect(ongletDe("/climat")).toBe("climat");
    expect(ongletDe("/rotations")).toBe("rotations");
    expect(ongletDe("/rotations/B")).toBe("rotations");
    expect(ongletDe("/fiche/B?r=poro")).toBe("rotations");
    expect(ongletDe("/tableau")).toBe("tableau");
    expect(ongletDe("/")).toBe("tableau");
    expect(ongletDe("/methode")).toBeNull();
    expect(ongletDe("/lexique")).toBeNull();
  });

  it("dans l'app, aller vers la page d'un autre onglet demande à l'app de changer d'onglet", () => {
    const postMessage = vi.fn();
    (window as any).ReactNativeWebView = { postMessage };
    window.history.pushState({}, "", "/parcelle?app=1");
    expect(ouvrirDansApp("/climat")).toBe(true);
    expect(JSON.parse(postMessage.mock.calls[0][0])).toEqual({ type: "ouvrir", onglet: "climat", chemin: "/climat" });
  });

  it("reste dans la page : même onglet, page sans onglet, ou hors de l'app", () => {
    const postMessage = vi.fn();
    (window as any).ReactNativeWebView = { postMessage };
    window.history.pushState({}, "", "/rotations?app=1");
    expect(ouvrirDansApp("/rotations/B")).toBe(false);
    expect(ouvrirDansApp("/methode")).toBe(false);
    delete (window as any).ReactNativeWebView;
    expect(ouvrirDansApp("/climat")).toBe(false);
    expect(postMessage).not.toHaveBeenCalled();
  });

  it("un clic sur un lien vers un autre onglet est confié à l'app", () => {
    const postMessage = vi.fn();
    (window as any).ReactNativeWebView = { postMessage };
    window.history.pushState({}, "", "/climat?app=1");
    const surClic = vi.fn();
    const { getByText } = render(
      <>
        <ModeApp />
        <a href="/rotations" onClick={surClic}>Voir les rotations</a>
        <a href="/methode" onClick={(e) => e.preventDefault()}>Méthode</a>
      </>,
    );
    fireEvent.click(getByText("Voir les rotations"));
    expect(surClic).not.toHaveBeenCalled();
    expect(JSON.parse(postMessage.mock.calls[0][0])).toEqual({ type: "ouvrir", onglet: "rotations", chemin: "/rotations" });
    fireEvent.click(getByText("Méthode"));
    expect(postMessage).toHaveBeenCalledTimes(1);
  });

  it("l'app peut demander à la page d'aller vers un chemin du site", () => {
    window.history.pushState({}, "", "/rotations?app=1");
    render(<ModeApp />);
    act(() => duNatif({ type: "aller", chemin: "/rotations/C" }));
    expect(push).toHaveBeenCalledWith("/rotations/C");
    act(() => duNatif({ type: "aller", chemin: "https://ailleurs.test/" }));
    expect(push).toHaveBeenCalledTimes(1);
  });
});

describe("alerte de semis (pont vers l'app)", () => {
  it("hors de l'app, l'interrupteur n'existe pas", async () => {
    const { AlerteSemis } = await import("@/components/AlerteSemis");
    window.history.pushState({}, "", "/tableau");
    const { container } = render(<AlerteSemis />);
    expect(container).toBeEmptyDOMElement();
  });

  it("dans l'app : activer envoie la demande, un refus est expliqué", async () => {
    const { AlerteSemis } = await import("@/components/AlerteSemis");
    const postMessage = vi.fn();
    (window as any).ReactNativeWebView = { postMessage };
    window.history.pushState({}, "", "/tableau?app=1");
    const { getByRole, findByText } = render(<AlerteSemis />);
    fireEvent.click(getByRole("switch", { name: "M'alerter quand semer" }));
    expect(JSON.parse(postMessage.mock.calls.at(-1)![0])).toEqual({ type: "alerte", action: "activer" });
    act(() => duNatif({ type: "alerte", etat: "refus" }));
    expect(await findByText(/Notifications refusées : activez-les dans les réglages du téléphone/)).toBeInTheDocument();
    expect(getByRole("switch")).toHaveAttribute("aria-checked", "false");
    act(() => duNatif({ type: "alerte", etat: "active" }));
    expect(getByRole("switch")).toHaveAttribute("aria-checked", "true");
    fireEvent.click(getByRole("button", { name: "Tester l'alerte" }));
    expect(JSON.parse(postMessage.mock.calls.at(-1)![0])).toEqual({ type: "alerte", action: "tester" });
  });

  it("un message d'alerte mal formé est ignoré", () => {
    const recu = vi.fn();
    const arreter = ecouterNatif(recu);
    duNatif({ type: "alerte", etat: "piratage" });
    duNatif({ type: "alerte" });
    expect(recu).not.toHaveBeenCalled();
    arreter();
  });

  it("l'accueil donne à l'app la région et la culture à semer", () => {
    const postMessage = vi.fn();
    (window as any).ReactNativeWebView = { postMessage };
    window.history.pushState({}, "", "/tableau?app=1");
    expect(envoyerParcelle("poro", "Maïs")).toBe(true);
    expect(JSON.parse(postMessage.mock.calls[0][0])).toEqual({ type: "parcelle", region: "poro", culture: "Maïs" });
  });
});
