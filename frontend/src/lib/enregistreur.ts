/**
 * Enregistrement de la voix dans le navigateur (et dans l'app Android, qui affiche le site) : le micro est lu en PCM
 * puis encodé en WAV 16 kHz. Ne dépend ni de la reconnaissance vocale du navigateur ni de celle de Google.
 */
import { encoderWav, enBase64 } from "./wav";

export type Session = { arreter: () => Promise<string>; annuler: () => void };

type AvecWebkit = typeof window & { webkitAudioContext?: typeof AudioContext };

export function dicteePossible(): boolean {
  if (typeof window === "undefined") return false;
  return !!navigator.mediaDevices?.getUserMedia && !!(window.AudioContext ?? (window as AvecWebkit).webkitAudioContext);
}

export async function demarrerEnregistrement(): Promise<Session> {
  const flux = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  const Contexte = window.AudioContext ?? (window as AvecWebkit).webkitAudioContext!;
  const ctx = new Contexte();
  await ctx.resume().catch(() => undefined);
  const source = ctx.createMediaStreamSource(flux);
  const processeur = ctx.createScriptProcessor(4096, 1, 1);
  const morceaux: Float32Array[] = [];
  processeur.onaudioprocess = (e) => morceaux.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  // Le processeur doit être relié à la sortie pour tourner ; un gain nul évite tout écho dans le haut-parleur.
  const muet = ctx.createGain();
  muet.gain.value = 0;
  source.connect(processeur);
  processeur.connect(muet);
  muet.connect(ctx.destination);
  let ferme = false;
  const fermer = () => {
    if (ferme) return;
    ferme = true;
    processeur.onaudioprocess = null;
    processeur.disconnect();
    source.disconnect();
    flux.getTracks().forEach((t) => t.stop());
    ctx.close().catch(() => undefined);
  };
  return {
    arreter: async () => {
      const taux = ctx.sampleRate;
      fermer();
      return enBase64(encoderWav(morceaux, taux));
    },
    annuler: fermer,
  };
}
