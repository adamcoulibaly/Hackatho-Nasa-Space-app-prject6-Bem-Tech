import type { Rotation } from "@/lib/contract";
import { Logo } from "./Logo";
import { prochaineCulture } from "@/lib/whatsapp";

export function Fiche({ rotation }: { rotation: Rotation }) {
  const r = rotation;
  const { culture, moisSemis } = prochaineCulture(r);
  return (
    <article className="mx-auto flex w-full max-w-[540px] flex-col overflow-hidden rounded-[28px] bg-paper text-ink print:rounded-none">
      <div className="flex h-2.5 shrink-0" aria-hidden="true">
        <div className="flex-grow bg-orange" /><div className="flex-grow bg-white" /><div className="flex-grow bg-green" />
      </div>
      <div data-stagger className="flex flex-col gap-[18px] px-4 py-5 sm:px-[30px] sm:py-[26px]">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex shrink-0 items-center gap-2.5">
            <Logo size={40} />
            <span className="font-display text-[22px] font-bold tracking-[-0.04em]">foro<span className="text-orange-dark">sat</span></span>
          </div>
          <span className="whitespace-nowrap text-xs font-bold uppercase tracking-[0.12em] text-muted sm:text-sm">Fiche conseil</span>
        </div>
        <p className="m-0 text-[17px] text-muted">Rotation {r.id} · {r.sequence.join(" → ")}</p>

        <div className="flex flex-col gap-2.5 rounded-[30px] bg-ink p-5 text-paper sm:p-[26px]">
          <span className="text-lg text-[#C9D4CD]">La saison prochaine, semez</span>
          <p className="m-0 break-words font-display text-[44px] font-extrabold leading-none tracking-[-0.05em] text-orange sm:text-[54px]">{culture}</p>
          <span className="text-lg leading-snug">dès les premières bonnes pluies, vers <strong>{moisSemis}</strong>.</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {r.sequence.map((c, i) => (
            <div key={c + i} className={`flex min-w-0 flex-col gap-1 rounded-[20px] p-2.5 sm:p-3.5 ${c === culture ? "bg-orange" : "bg-white"}`}>
              <span className="text-sm text-muted">Année {i + 1}</span>
              <span className="break-words font-display text-[15px] font-bold leading-tight sm:text-lg">{c}</span>
            </div>
          ))}
        </div>

        <section className="flex flex-col gap-3.5 rounded-[26px] bg-white p-4 sm:p-5">
          <h2 className="m-0 font-display text-lg font-bold">Pourquoi ?</h2>
          {r.pourquoi.map((p) => <p key={p} className="m-0 text-[17px] leading-snug">{p}</p>)}
        </section>

        <section className="flex flex-col gap-1 rounded-[22px] bg-[#FDE7CC] px-[18px] py-4 text-[#5C2E00]">
          <h2 className="m-0 text-base font-bold">Attention</h2>
          {r.risques.map((x) => <p key={x} className="m-0 text-base leading-snug">{x}</p>)}
          <p className="m-0 text-base leading-snug">Lacunes : {r.lacune}</p>
        </section>

        <p className="m-0 border-t border-[#DDE3DC] pt-3.5 text-[13px] leading-normal text-muted">
          Confiance : {r.confiance.niveau} · Climat NASA POWER · fiches cultures à valider<br />
          ForoSat est une aide à la décision : il ne remplace pas l'avis d'un conseiller agricole.
        </p>
      </div>
    </article>
  );
}
