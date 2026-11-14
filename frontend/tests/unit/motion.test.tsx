import { render, screen, act } from "@testing-library/react";
import { Compteur } from "@/components/Compteur";
import { BottomNav } from "@/components/BottomNav";

describe("Compteur", () => {
  it("sans animation possible (pas d'IntersectionObserver), la valeur finale s'affiche tout de suite", () => {
    render(<p><Compteur valeur={18} format={(n) => `${n} bonnes saisons`} /></p>);
    expect(screen.getByText("18 bonnes saisons")).toBeInTheDocument();
  });

  it("monte de 0 à la valeur quand il entre à l'écran, puis s'arrête pile sur la valeur", async () => {
    let rappel: (e: { isIntersecting: boolean }[]) => void = () => undefined;
    (window as any).IntersectionObserver = class {
      constructor(cb: any) { rappel = cb; }
      observe() {}
      disconnect() {}
    };
    vi.useFakeTimers();
    render(<Compteur valeur={42} />);
    expect(screen.getByText("0")).toBeInTheDocument();
    act(() => rappel([{ isIntersecting: true }]));
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText("42")).toBeInTheDocument();
    vi.useRealTimers();
    delete (window as any).IntersectionObserver;
  });
});

describe("BottomNav animé", () => {
  it("un indicateur glisse sous l'onglet actif (position selon l'onglet)", () => {
    const { container } = render(<BottomNav current="rotations" />);
    const indicateur = container.querySelector("[data-indicateur]") as HTMLElement;
    expect(indicateur).not.toBeNull();
    expect(indicateur.style.getPropertyValue("--onglet")).toBe("2");
  });
});
