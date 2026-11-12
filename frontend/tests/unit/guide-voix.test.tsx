import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LireAVoixHaute } from "@/components/LireAVoixHaute";
import { GuideEtapes, ETAPES_GUIDE } from "@/components/GuideEtapes";
import { texteFiche } from "@/lib/voix";

afterEach(() => {
  sessionStorage.clear();
  window.history.pushState({}, "", "/");
  delete (window as any).ReactNativeWebView;
  delete (window as any).speechSynthesis;
  delete (window as any).SpeechSynthesisUtterance;
});

describe("LireAVoixHaute", () => {
  it("dans le navigateur : lit le texte en français avec la voix du navigateur", async () => {
    const speak = vi.fn();
    (window as any).speechSynthesis = { speak, cancel: vi.fn() };
    (window as any).SpeechSynthesisUtterance = class { lang = ""; constructor(public text: string) {} };
    render(<LireAVoixHaute texte="Semez le maïs en mai." />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Écouter" }));
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0]).toMatchObject({ text: "Semez le maïs en mai.", lang: "fr-FR" });
  });

  it("dans l'app : demande la lecture à la voix du téléphone", async () => {
    const postMessage = vi.fn();
    (window as any).ReactNativeWebView = { postMessage };
    window.history.pushState({}, "", "/fiche/B?app=1");
    render(<LireAVoixHaute texte="Semez le maïs en mai." />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Écouter" }));
    expect(JSON.parse(postMessage.mock.calls[0][0])).toEqual({ type: "lire", texte: "Semez le maïs en mai." });
  });

  it("sans voix disponible : pas de bouton", () => {
    const { container } = render(<LireAVoixHaute texte="x" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("texteFiche", () => {
  it("résume la fiche en phrases à lire", () => {
    const t = texteFiche({ id: "B", sequence: ["Coton", "Maïs", "Niébé"], pourquoi: ["Le niébé enrichit le sol."], lacune: "prix locaux non intégrés" }, { culture: "Maïs", moisSemis: "mai" });
    expect(t).toBe("Rotation B : Coton, puis Maïs, puis Niébé. La saison prochaine, semez Maïs dès les premières bonnes pluies, vers mai. Pourquoi : Le niébé enrichit le sol. À vérifier : prix locaux non intégrés.");
  });
});

describe("Guide d'utilisation", () => {
  it("présente les étapes de ForoSat, chacune avec un lien pour essayer", () => {
    render(<GuideEtapes />);
    expect(ETAPES_GUIDE.length).toBeGreaterThanOrEqual(6);
    for (const e of ETAPES_GUIDE) expect(screen.getByRole("link", { name: new RegExp(e.action) })).toHaveAttribute("href", e.href);
  });
});
