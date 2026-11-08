import { render } from "@testing-library/react";
import { estModeApp, envoyerAuNatif, ecouterNatif } from "@/lib/modeApp";
import { ModeApp } from "@/components/ModeApp";

describe("mode app", () => {
  afterEach(() => {
    sessionStorage.clear();
    window.history.pushState({}, "", "/");
    document.documentElement.classList.remove("mode-app");
    delete (window as any).ReactNativeWebView;
  });

  it("?app=1 active le mode pour toute la session", () => {
    expect(estModeApp()).toBe(false);
    window.history.pushState({}, "", "/parcelle?app=1");
    expect(estModeApp()).toBe(true);
    window.history.pushState({}, "", "/climat");
    expect(estModeApp()).toBe(true);
  });

  it("ModeApp pose la classe mode-app sur la page", () => {
    window.history.pushState({}, "", "/?app=1");
    render(<ModeApp />);
    expect(document.documentElement.classList.contains("mode-app")).toBe(true);
  });

  it("sans app native, rien n'est envoyé", () => {
    expect(envoyerAuNatif({ type: "position" })).toBe(false);
  });

  it("avec l'app native, le message part en JSON", () => {
    const postMessage = vi.fn();
    (window as any).ReactNativeWebView = { postMessage };
    expect(envoyerAuNatif({ type: "partager", url: "https://x.test/fiche/B", texte: "Bonjour" })).toBe(true);
    expect(JSON.parse(postMessage.mock.calls[0][0])).toEqual({ type: "partager", url: "https://x.test/fiche/B", texte: "Bonjour" });
  });

  it("reçoit la position envoyée par l'app et ignore le reste", () => {
    const recu = vi.fn();
    const arreter = ecouterNatif(recu);
    window.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ type: "position", lat: 9.45, lon: -5.63 }) }));
    window.dispatchEvent(new MessageEvent("message", { data: "pas du json" }));
    window.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ type: "autre" }) }));
    expect(recu).toHaveBeenCalledTimes(1);
    expect(recu).toHaveBeenCalledWith({ type: "position", lat: 9.45, lon: -5.63 });
    arreter();
  });
});
