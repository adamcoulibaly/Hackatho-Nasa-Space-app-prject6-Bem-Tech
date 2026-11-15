import type { Climat } from "@/lib/contract";

const MOIS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MOIS_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const virgule = (v: number, d = 1) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

type Eco = NonNullable<Climat["ecostress"]>;
/** En dessous, trop peu de passages sans nuage pour une moyenne ou une part de jours chauds qui ait un sens. */
export const PASSAGES_MIN = 8;
export const assezDePassages = (e: Eco) => e.passages >= PASSAGES_MIN;

/** Les mois les plus chauds mesurés (jusqu'à 3, dans l'ordre de l'année). */
export function moisLesPlusChauds(e: Eco): string[] {
  const mesures = e.lst.map((v, i) => ({ v, i })).filter((x): x is { v: number; i: number } => x.v !== null);
  return mesures.sort((a, b) => b.v - a.v).slice(0, 3).sort((a, b) => a.i - b.i).map((x) => MOIS_LONG[x.i]);
}

export function phraseChaleur(e: Eco): string {
  const part = e.joursChauds === null ? null : Math.round(e.joursChauds * 100);
  const chauds = moisLesPlusChauds(e);
  if (!assezDePassages(e)) {
    return `ECOSTRESS n'a vu le sol sans nuage que ${e.passages} fois ici en ${e.periode} : trop peu pour une moyenne fiable. Dans cette zone souvent nuageuse, fiez-vous à la chaleur NASA POWER et MODIS de la page.`;
  }
  const debut = `Sur ${e.passages} passages sans nuage (${e.periode}), `;
  if (part === null) return `${debut}la surface des champs n'a pas pu être mesurée assez souvent.`;
  if (part === 0) return `${debut}la surface des champs n'a jamais dépassé ${e.seuil} °C : peu de stress de chaleur au ras du sol.`;
  return `${debut}la surface des champs a dépassé ${e.seuil} °C ${part} % du temps${chauds.length ? `, surtout en ${chauds.join(", ").replace(/, ([^,]*)$/, " et $1")}` : ""}. À ces moments, semez après les premières pluies et gardez le sol couvert (paillage, résidus) pour protéger les jeunes plants.`;
}

/** Une rangée de 12 barres pour une mesure ; un mois sans passage clair reste vide (pas zéro). */
function Rangee({ titre, unite, valeurs, couleur, decimales, max }: { titre: string; unite: string; valeurs: (number | null)[]; couleur: string; decimales: number; max: number }) {
  return (
    <figure className="m-0 flex flex-col gap-2">
      <figcaption className="text-sm font-semibold">{titre} <span className="font-normal text-muted">({unite})</span></figcaption>
      <div className="grid h-[110px] grid-cols-12 items-end gap-1.5">
        {valeurs.map((v, i) => (
          <div key={i} title={v === null ? `${MOIS_LONG[i]} : aucun passage sans nuage` : `${MOIS_LONG[i]} : ${virgule(v, decimales)} ${unite}`} className="flex h-full flex-col items-center justify-end gap-1">
            {v === null ? (
              <span className="text-[11px] text-muted" aria-hidden="true">–</span>
            ) : (
              <>
                <span className="text-[11px] font-semibold tabular-nums text-muted">{virgule(v, decimales === 2 ? 1 : 0)}</span>
                <span className="bar-grow w-full max-w-[28px] rounded-t-[4px]" style={{ height: `${Math.max(6, (v / max) * 80)}px`, background: couleur, ["--i" as string]: i } as React.CSSProperties} />
              </>
            )}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-12 gap-1.5 border-t border-line pt-1 text-center text-xs text-muted">{MOIS.map((m, i) => <span key={i}>{m}</span>)}</div>
    </figure>
  );
}

/** Température de surface et évapotranspiration ECOSTRESS au-dessus des champs de la région. */
export function ChaleurChamps({ ecostress: e }: { ecostress: Eco }) {
  const lst = e.lst.filter((v): v is number => v !== null);
  const et = e.et.filter((v): v is number => v !== null);
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[15px] leading-normal" data-testid="phrase-ecostress">{phraseChaleur(e)}</p>
      {assezDePassages(e) && <div className="grid gap-5 md:grid-cols-2">
        {lst.length > 0 && <Rangee titre="Température de la surface des champs, en milieu de journée" unite="°C" valeurs={e.lst} couleur="#F77F00" decimales={1} max={Math.max(...lst)} />}
        {et.length > 0 && <Rangee titre="Eau évaporée par le sol et les plantes" unite="mm par jour" valeurs={e.et} couleur="#2F6FB5" decimales={2} max={Math.max(...et)} />}
      </div>}
      <p className="m-0 text-[13px] leading-normal text-muted">
        ECOSTRESS mesure depuis la Station spatiale internationale, avec des pixels de 70 m : assez fin pour voir les champs, mais il ne passe pas tous les jours et les nuages cachent souvent le sol en saison des pluies. Un tiret signale un mois sans passage clair. Mesure : {e.point}. Source : {e.source}.
      </p>
    </div>
  );
}
