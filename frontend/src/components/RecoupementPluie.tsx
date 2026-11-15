import type { Climat } from "@/lib/contract";
import { barHeight } from "@/lib/format";

const MOIS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const MOIS_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
/** Couleurs des deux sources (palette vérifiée : séparées aussi pour les daltoniens). */
export const COULEUR_POWER = "#009E60";
export const COULEUR_IMERG = "#2F6FB5";

const mm = (v: number) => `${Math.round(v).toLocaleString("fr-FR")} mm`;

/** La phrase qui dit si les deux sources s'accordent, et ce que l'agriculteur en fait. */
export function verdictRecoupement(i: NonNullable<Climat["imerg"]>): string {
  const n = Math.abs(i.ecartPct);
  const sens = i.ecartPct === 0 ? "les deux totaux annuels sont identiques" : `les satellites mesurent ${n} % de pluie en ${i.ecartPct < 0 ? "moins" : "plus"} que NASA POWER sur l'année`;
  if (i.accord === "bon") return `Les deux mesures concordent : même saison, et ${sens}. Les quantités de pluie de ForoSat sont fiables ici.`;
  if (i.accord === "moyen") return `Les deux mesures suivent la même saison, mais ${sens} : fiez-vous aux mois de pluie, prenez les quantités comme une fourchette.`;
  return `Les deux mesures divergent ici : ${sens}. Le calendrier des pluies reste utile, mais prenez les quantités avec prudence et comparez à votre pluviomètre si vous en avez un.`;
}

/** Pluie mois par mois selon NASA POWER et selon les satellites GPM (IMERG), côte à côte. */
export function RecoupementPluie({ imerg }: { imerg: NonNullable<Climat["imerg"]> }) {
  const max = Math.max(...imerg.pluieMensuelle, ...imerg.pluieMensuellePower);
  const r = imerg.correlation === null ? null : imerg.correlation.toFixed(2).replace(".", ",");
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Légende">
        <span className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-[3px]" style={{ background: COULEUR_POWER }} />NASA POWER · <strong>{mm(imerg.annuelPower)}/an</strong></span>
        <span className="flex items-center gap-2"><span aria-hidden="true" className="h-3 w-3 rounded-[3px]" style={{ background: COULEUR_IMERG }} />GPM IMERG (satellites) · <strong>{mm(imerg.annuel)}/an</strong></span>
      </div>
      <div className="min-w-0">
        <div>
          <div className="grid h-[180px] grid-cols-12 items-end gap-1 px-0 sm:gap-2 sm:px-1" data-testid="recoupement-barres">
            {imerg.pluieMensuellePower.map((p, k) => {
              const s = imerg.pluieMensuelle[k];
              return (
                <div key={MOIS[k]} title={`${MOIS_LONG[k]} : NASA POWER ${mm(p)} · IMERG ${mm(s)}`} className="flex h-full min-w-0 items-end justify-center gap-[2px]">
                  <span className="bar-grow w-1/2 max-w-[18px] rounded-t-[4px]" style={{ height: barHeight(p, max, 170), background: COULEUR_POWER, ["--i" as string]: k } as React.CSSProperties} />
                  <span className="bar-grow w-1/2 max-w-[18px] rounded-t-[4px]" style={{ height: barHeight(s, max, 170), background: COULEUR_IMERG, ["--i" as string]: k } as React.CSSProperties} />
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-12 gap-1 border-t border-line px-0 pt-2 text-center text-[10px] text-muted sm:gap-2 sm:px-1 sm:text-[13px]">
            {MOIS.map((m) => <span key={m}>{m}</span>)}
          </div>
        </div>
      </div>
      <p className="m-0 text-[15px] leading-normal" data-testid="verdict-recoupement">{verdictRecoupement(imerg)}</p>
      <p className="m-0 text-[13px] leading-normal text-muted">
        IMERG fusionne les mesures de la constellation de satellites GPM : une pluie mesurée depuis l&apos;espace, indépendante du modèle utilisé par NASA POWER.
        Comparaison sur {imerg.mois} mois ({imerg.periode}), moyenne d&apos;un carré de 0,5° autour du chef-lieu{r ? `, corrélation mois par mois ${r}` : ""}. Source : {imerg.source}.
      </p>
      <div className="sr-only"><table>
        <caption>Pluie moyenne par mois, NASA POWER et GPM IMERG</caption>
        <thead><tr><th>Mois</th><th>NASA POWER (mm)</th><th>GPM IMERG (mm)</th></tr></thead>
        <tbody>{MOIS_LONG.map((m, k) => <tr key={m}><td>{m}</td><td>{imerg.pluieMensuellePower[k]}</td><td>{imerg.pluieMensuelle[k]}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}
