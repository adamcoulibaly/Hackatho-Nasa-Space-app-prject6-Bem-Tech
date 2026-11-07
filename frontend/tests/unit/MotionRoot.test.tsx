import { render, act } from "@testing-library/react";
import { MotionRoot } from "@/components/MotionRoot";

type Rappel = (entrees: { target: Element; isIntersecting: boolean }[]) => void;
let rappel: Rappel = () => {};
const observes = new Set<Element>();

class FauxIntersectionObserver {
  constructor(cb: Rappel) {
    rappel = cb;
  }
  observe(el: Element) {
    observes.add(el);
  }
  unobserve(el: Element) {
    observes.delete(el);
  }
  disconnect() {
    observes.clear();
  }
}

describe("MotionRoot", () => {
  beforeEach(() => {
    observes.clear();
    document.documentElement.classList.remove("js-motion");
  });

  it("sans IntersectionObserver, ne cache rien", () => {
    const sauve = (window as any).IntersectionObserver;
    delete (window as any).IntersectionObserver;
    render(<MotionRoot />);
    expect(document.documentElement.classList.contains("js-motion")).toBe(false);
    (window as any).IntersectionObserver = sauve;
  });

  it("observe les blocs de main et ceux ajoutés plus tard, puis les marque visibles", async () => {
    (window as any).IntersectionObserver = FauxIntersectionObserver;
    const { container } = render(<><main><section id="a" /></main><MotionRoot /></>);
    expect(document.documentElement.classList.contains("js-motion")).toBe(true);
    const a = container.querySelector("#a")!;
    expect(observes.has(a)).toBe(true);

    const b = document.createElement("div");
    b.id = "b";
    await act(async () => {
      container.querySelector("main")!.appendChild(b);
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(observes.has(b)).toBe(true);

    act(() => rappel([{ target: a, isIntersecting: true }]));
    expect(a.hasAttribute("data-inview")).toBe(true);
    expect(observes.has(a)).toBe(false);
  });
});
