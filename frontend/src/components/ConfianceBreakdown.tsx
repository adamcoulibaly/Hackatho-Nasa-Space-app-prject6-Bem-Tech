import type { Rotation } from "@/lib/contract";
import { scoreSegments, scoreWord } from "@/lib/format";

const FACTEURS: { key: keyof Rotation["confiance"]["facteurs"]; label: string }[] = [
  { key: "accordSources", label: "Accord entre les sources" },
  { key: "finesse", label: "Finesse vs taille de la parcelle" },
  { key: "historique", label: "Années d'historique" },
  { key: "verification", label: "Vérification sur le terrain" },
];

export function ConfianceBreakdown({ confiance }: { confiance: Rotation["confiance"] }) {
  return (
    <div className="flex flex-col gap-3.5">
      <ul className="m-0 flex flex-col gap-3 p-0">
        {FACTEURS.map((f) => {
          const lv = confiance.facteurs[f.key];
          return (
            <li key={f.key} className="m-0 flex list-none flex-col gap-1.5">
              <div className="flex justify-between gap-2 text-sm"><span>{f.label}</span><span className="font-bold">{scoreWord(lv)}</span></div>
              <div className="flex gap-1" role="img" aria-label={`${f.label} : ${scoreWord(lv)}, ${lv} sur 5`}>
                {scoreSegments(lv, false).map((c, i) => <div key={i} className="h-2 flex-grow rounded-[3px]" style={{ background: c }} />)}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="m-0 text-[15px]">Résultat : <strong>confiance {confiance.niveau}</strong></p>
    </div>
  );
}
