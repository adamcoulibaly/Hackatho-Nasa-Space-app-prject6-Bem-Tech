import { encoderWav, enBase64 } from "@/lib/wav";
import { transcrire, MODELES_AUDIO_PAR_DEFAUT, DicteeSchema } from "@/lib/ia/transcription";

describe("encoderWav", () => {
  it("WAV mono 16 bits à 16 kHz, rééchantillonné depuis le micro (48 kHz)", () => {
    const s = new Float32Array(4800).fill(0.5); // 0,1 s à 48 kHz
    const buf = encoderWav([s], 48000);
    const v = new DataView(buf);
    const txt = (o: number) => String.fromCharCode(...new Uint8Array(buf, o, 4));
    expect([txt(0), txt(8), txt(36)]).toEqual(["RIFF", "WAVE", "data"]);
    expect(v.getUint16(22, true)).toBe(1); // mono
    expect(v.getUint32(24, true)).toBe(16000);
    expect(v.getUint16(34, true)).toBe(16);
    expect(v.getUint32(40, true)).toBe(1600 * 2); // 0,1 s à 16 kHz
    expect(v.getInt16(44, true)).toBe(Math.round(0.5 * 0x7fff));
    expect(enBase64(buf).startsWith("UklGR")).toBe(true);
  });
});

describe("transcription côté serveur", () => {
  const audio = enBase64(encoderWav([new Float32Array(1600)], 16000));

  it("n'accepte qu'un WAV de taille raisonnable", () => {
    expect(DicteeSchema.safeParse({ audio }).success).toBe(true);
    expect(DicteeSchema.safeParse({ audio: "SGVsbG8=" }).success).toBe(false);
    expect(DicteeSchema.safeParse({ audio: "UklGR" + "A".repeat(1_500_000) }).success).toBe(false);
  });

  it("envoie l'audio WAV à un modèle audio gratuit et renvoie le texte en français, sans guillemets", async () => {
    let corps: any;
    const f = vi.fn(async (_u: string, init: RequestInit) => {
      corps = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ choices: [{ message: { content: "« Quand semer le maïs ? »" } }] }));
    });
    const r = await transcrire(audio, { config: { cle: "k", baseUrl: "https://ex.test/v1", modeles: [] }, modeles: MODELES_AUDIO_PAR_DEFAUT, fetch: f as typeof fetch });
    expect(r).toEqual({ ok: true, texte: "Quand semer le maïs ?" });
    expect(MODELES_AUDIO_PAR_DEFAUT[0]).toMatch(/nemotron.*omni.*:free/);
    const contenu = corps.messages.at(-1).content;
    expect(contenu.find((c: any) => c.type === "input_audio")).toEqual({ type: "input_audio", input_audio: { data: audio, format: "wav" } });
  });

  it("rien entendu : texte vide ; sans clé : non configuré", async () => {
    const f = (async () => new Response(JSON.stringify({ choices: [{ message: { content: "[rien]" } }] }))) as typeof fetch;
    expect(await transcrire(audio, { config: { cle: "k", baseUrl: "https://ex.test/v1", modeles: [] }, modeles: ["m"], fetch: f })).toEqual({ ok: true, texte: "" });
    expect(await transcrire(audio, { config: { baseUrl: "https://ex.test/v1", modeles: [] }, modeles: ["m"], fetch: f })).toMatchObject({ ok: false, statut: 503 });
  });
});

describe("dictée disponible seulement si le compte OpenRouter le permet", () => {
  const cfg = { cle: "k", baseUrl: "https://ex.test/v1", modeles: [] };
  const credits = (total: number, usage: number) => (async () => new Response(JSON.stringify({ data: { total_credits: total, total_usage: usage } }))) as typeof fetch;

  it("solde d'au moins 0,50 $ : disponible ; en dessous ou sans clé : non", async () => {
    const { dicteeDisponible, oublierDisponibilite } = await import("@/lib/ia/transcription");
    oublierDisponibilite();
    expect(await dicteeDisponible(cfg, credits(1, 0.2))).toBe(true);
    oublierDisponibilite();
    expect(await dicteeDisponible(cfg, credits(0, 0))).toBe(false);
    oublierDisponibilite();
    expect(await dicteeDisponible({ ...cfg, cle: undefined }, credits(5, 0))).toBe(false);
    oublierDisponibilite();
    // Autre fournisseur sans route de solde : on essaie.
    expect(await dicteeDisponible(cfg, (async () => new Response("", { status: 404 })) as typeof fetch)).toBe(true);
  });

  it("un refus faute de crédit (402) rend la dictée indisponible", async () => {
    const { dicteeDisponible, oublierDisponibilite } = await import("@/lib/ia/transcription");
    oublierDisponibilite();
    const r = await transcrire(enBase64(encoderWav([new Float32Array(1600)], 16000)), { config: cfg, modeles: ["m"], fetch: (async () => new Response("{}", { status: 402 })) as typeof fetch });
    expect(r).toMatchObject({ ok: false, statut: 503 });
    expect(await dicteeDisponible(cfg, credits(10, 0))).toBe(false);
  });
});

describe("transcription gratuite par Whisper (Groq)", () => {
  const audio = enBase64(encoderWav([new Float32Array(1600)], 16000));
  const cfg = { cle: "k", baseUrl: "https://ex.test/v1", modeles: [] };

  it("avec une clé de transcription : envoie le WAV à /audio/transcriptions en français et renvoie le texte", async () => {
    const { transcrire, configStt, oublierDisponibilite } = await import("@/lib/ia/transcription");
    oublierDisponibilite();
    const stt = configStt({ STT_API_KEY: "gsk_test" });
    expect(stt).toEqual({ cle: "gsk_test", baseUrl: "https://api.groq.com/openai/v1", modele: "whisper-large-v3-turbo" });
    let url = "";
    let form: FormData | null = null;
    const f = vi.fn(async (u: string, init: RequestInit) => {
      url = u;
      form = init.body as FormData;
      return new Response(JSON.stringify({ text: " Quand semer le maïs ? " }));
    });
    const r = await transcrire(audio, { config: cfg, modeles: ["m"], fetch: f as typeof fetch, stt });
    expect(r).toEqual({ ok: true, texte: "Quand semer le maïs ?" });
    expect(url).toBe("https://api.groq.com/openai/v1/audio/transcriptions");
    expect(form!.get("model")).toBe("whisper-large-v3-turbo");
    expect(form!.get("language")).toBe("fr");
    expect((form!.get("file") as File).type).toBe("audio/wav");
  });

  it("une clé de transcription suffit pour rendre la dictée disponible, sans crédit OpenRouter", async () => {
    const { dicteeDisponible, configStt, oublierDisponibilite } = await import("@/lib/ia/transcription");
    oublierDisponibilite();
    const f = vi.fn();
    expect(await dicteeDisponible({ ...cfg, cle: undefined }, f as unknown as typeof fetch, Date.now(), configStt({ STT_API_KEY: "gsk" }))).toBe(true);
    expect(f).not.toHaveBeenCalled();
    expect(configStt({})).toBeNull();
  });

  it("Whisper en panne : OpenRouter prend le relais s'il le peut", async () => {
    const { transcrire, configStt } = await import("@/lib/ia/transcription");
    const f = vi.fn(async (u: string) =>
      u.endsWith("/audio/transcriptions") ? new Response("{}", { status: 500 }) : new Response(JSON.stringify({ choices: [{ message: { content: "Et le coton ?" } }] })),
    );
    const r = await transcrire(audio, { config: cfg, modeles: ["m"], fetch: f as typeof fetch, stt: configStt({ STT_API_KEY: "gsk" }) });
    expect(r).toEqual({ ok: true, texte: "Et le coton ?" });
  });
});
