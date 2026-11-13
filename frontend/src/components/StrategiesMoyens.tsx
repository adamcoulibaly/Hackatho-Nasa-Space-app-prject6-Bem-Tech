import type { Strategie } from "@/lib/moteur/strategies";

/** Trois stratégies selon les moyens : économique, équilibrée, orientée rendement, avec leurs contraintes. */
export function StrategiesMoyens({ strategies }: { strategies: Strategie[] }) {
  return (
    <section className="flex flex-col gap-4 rounded-[28px] bg-white p-5 sm:p-[26px]">
      <h2 className="m-0 font-display text-xl font-bold tracking-[-0.02em]">Selon vos moyens</h2>
      <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-3">
        {strategies.map((s) => (
          <li key={s.id} data-testid="strategie" className={`flex min-w-0 flex-col gap-2 rounded-2xl p-4 ${s.conseillee ? "border-2 border-ink" : "bg-paper"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="font-display text-lg">{s.titre}</strong>
              {s.conseillee && <span className="rounded-full bg-green px-2.5 py-1 text-xs font-bold text-ink">Conseillée pour vos moyens</span>}
            </div>
            <span className="text-[15px] font-semibold">{s.sequence.join(" → ")}</span>
            <span className="text-sm text-muted">{s.pourquoi}</span>
            {s.rendementMoyen !== undefined && <span className="text-sm">{`Rendement estimé : ${s.rendementMoyen} % du potentiel (21 saisons réelles)`}</span>}
            <ul className="m-0 flex flex-col gap-1 pl-5 text-sm">
              {s.contraintes.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </li>
        ))}
      </ul>
      <p className="m-0 text-xs leading-normal text-muted">Sans prix locaux fiables, les coûts sont décrits par les besoins en engrais, semences et travail (estimations à valider par l&apos;agronome). Indiquez vos moyens dans « Mon champ ».</p>
    </section>
  );
}
