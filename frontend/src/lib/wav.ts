/** Encodage WAV (PCM 16 bits, mono, 16 kHz) de la voix enregistrée : format lu par tous les modèles audio. */
export function encoderWav(morceaux: Float32Array[], tauxSource: number, tauxCible = 16000): ArrayBuffer {
  const total = morceaux.reduce((n, m) => n + m.length, 0);
  const brut = new Float32Array(total);
  let o = 0;
  for (const m of morceaux) {
    brut.set(m, o);
    o += m.length;
  }
  // Rééchantillonnage par moyenne (le micro tourne souvent à 44,1 ou 48 kHz).
  const pas = tauxSource / tauxCible;
  const n = Math.floor(total / pas);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const ecrire = (pos: number, s: string) => [...s].forEach((c, i) => v.setUint8(pos + i, c.charCodeAt(0)));
  ecrire(0, "RIFF");
  v.setUint32(4, 36 + n * 2, true);
  ecrire(8, "WAVE");
  ecrire(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, tauxCible, true);
  v.setUint32(28, tauxCible * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  ecrire(36, "data");
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const debut = Math.floor(i * pas);
    const fin = Math.max(debut + 1, Math.floor((i + 1) * pas));
    let somme = 0;
    for (let j = debut; j < fin && j < total; j++) somme += brut[j];
    const x = Math.max(-1, Math.min(1, somme / (fin - debut)));
    v.setInt16(44 + i * 2, Math.round(x < 0 ? x * 0x8000 : x * 0x7fff), true);
  }
  return buf;
}

export function enBase64(buf: ArrayBuffer): string {
  const octets = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < octets.length; i += 0x8000) s += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return btoa(s);
}
