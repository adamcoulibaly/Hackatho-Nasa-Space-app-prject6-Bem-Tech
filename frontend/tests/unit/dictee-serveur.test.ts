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
