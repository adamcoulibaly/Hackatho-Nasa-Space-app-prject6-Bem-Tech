import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { DEFAULT_PARCELLE, validateParcelle, type Parcelle } from "@/lib/parcelle/validate";
import { ParcelleProvider, useParcelle } from "@/lib/parcelle/context";

const wrapper = ({ children }: { children: ReactNode }) => <ParcelleProvider>{children}</ParcelleProvider>;

describe("validateParcelle", () => {
  it("accepte la parcelle par défaut", () => {
    expect(validateParcelle(DEFAULT_PARCELLE)).toEqual({ ok: true, erreurs: [] });
  });
  it.each([0, -3, NaN])("rejette une surface de %s", (surface) => {
    const r = validateParcelle({ ...DEFAULT_PARCELLE, surface });
    expect(r.ok).toBe(false);
    expect(r.erreurs).toContain("La surface doit être supérieure à 0.");
  });
  it("rejette sans culture ni priorité", () => {
    const r = validateParcelle({ ...DEFAULT_PARCELLE, cultures: [], priorites: [] } as Parcelle);
    expect(r.erreurs).toEqual(["Choisissez au moins une culture.", "Choisissez au moins une priorité."]);
  });
});

describe("ParcelleProvider", () => {
  beforeEach(() => localStorage.clear());

  it("démarre avec les valeurs par défaut si le stockage est corrompu", async () => {
    localStorage.setItem("forosat.parcelle", "{corrompu");
    const { result } = renderHook(() => useParcelle(), { wrapper });
    await waitFor(() => expect(result.current.pret).toBe(true));
    expect(result.current.parcelle).toEqual(DEFAULT_PARCELLE);
    expect(result.current.saisie).toBe(false);
  });

  it("enregistre les modifications et la saisie", async () => {
    const { result } = renderHook(() => useParcelle(), { wrapper });
    await waitFor(() => expect(result.current.pret).toBe(true));
    act(() => result.current.setParcelle({ surface: 5 }));
    act(() => result.current.marquerSaisie());
    expect(result.current.parcelle.surface).toBe(5);
    expect(result.current.saisie).toBe(true);
    const stocke = JSON.parse(localStorage.getItem("forosat.parcelle")!);
    expect(stocke.parcelle.surface).toBe(5);
    expect(stocke.saisie).toBe(true);
  });

  it("retrouve la parcelle au rechargement", async () => {
    localStorage.setItem("forosat.parcelle", JSON.stringify({ parcelle: { ...DEFAULT_PARCELLE, surface: 7 }, saisie: true }));
    const { result } = renderHook(() => useParcelle(), { wrapper });
    await waitFor(() => expect(result.current.pret).toBe(true));
    expect(result.current.parcelle.surface).toBe(7);
    expect(result.current.saisie).toBe(true);
  });
});
