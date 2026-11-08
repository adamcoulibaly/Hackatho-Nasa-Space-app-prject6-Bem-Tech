/** Lit une tuile NASA GIBS avec un délai maximal : un serveur qui ne répond pas ne bloque pas l'analyse de la photo. */
export async function lireTuile(url: string, f: typeof fetch = fetch, delaiMs = 5000): Promise<Buffer | null> {
  try {
    const r = await f(url, { headers: { "User-Agent": "forosat" }, signal: AbortSignal.timeout(delaiMs), next: { revalidate: 86400 } } as RequestInit);
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch {
    return null;
  }
}
