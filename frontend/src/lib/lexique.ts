import type { Terme } from "@/lib/contract";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function filterLexique(termes: Terme[], query: string): Terme[] {
  const q = norm(query.trim());
  if (!q) return termes;
  return termes.filter((t) => norm(`${t.terme} ${t.definition}`).includes(q));
}
