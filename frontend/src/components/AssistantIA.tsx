"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Parcelle } from "@/lib/parcelle/validate";
import { lienFiche } from "@/lib/moteur/fiche-lien";
import type { Moteur } from "@/lib/reconnaissance";
import { LireAVoixHaute } from "./LireAVoixHaute";
import { DicteeVocale } from "./DicteeVocale";
import { exigerInternet, messageHorsLigne } from "@/lib/enLigne";

type Message = { id: number; question: string | null; voix: boolean; reponse?: string; erreur?: string; secours?: boolean };

const EXPLIQUER = "Explique-moi cette rotation simplement.";
const ECHANGES_GARDES = 4;

/**
 * Assistant IA en conversation : chaque question (écrite ou dite à voix haute) s'ajoute au fil, et l'IA reçoit les
 * échanges précédents pour les questions de suite. Le score vient toujours des règles, pas de l'IA.
 */
export function AssistantIA({ id, parcelle, moteurDictee, autres = [] }: { id: "A" | "B" | "C"; parcelle: Parcelle; moteurDictee?: Moteur | null; autres?: ("A" | "B" | "C")[] }) {
  const [question, setQuestion] = useState("");
  const [fil, setFil] = useState<Message[]>([]);
  const [attente, setAttente] = useState(false);
  const compteur = useRef(0);
  const bas = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (fil.length) bas.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, [fil]);

  const envoyer = async (texte: string | null, voix = false) => {
    if (attente) return;
    const m: Message = { id: ++compteur.current, question: texte, voix };
    const historique = fil
      .filter((x) => x.reponse)
      .slice(-ECHANGES_GARDES)
      .flatMap((x) => [
        { role: "user" as const, content: (x.question ?? EXPLIQUER).slice(0, 600) },
        { role: "assistant" as const, content: x.reponse!.slice(0, 600) },
      ]);
    if (!exigerInternet("l'assistant IA")) return setFil((f) => [...f, { ...m, erreur: messageHorsLigne("l'assistant IA") }]);
    setFil((f) => [...f, m]);
    setQuestion("");
    setAttente(true);
    let maj: Partial<Message> = {};
    // Une coupure réseau passagère (téléphone, wifi de salle) est réessayée une fois avant de prévenir.
    for (let essai = 0; essai < 2; essai++) {
    try {
      const r = await fetch("/api/ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          params: lienFiche(id, parcelle).split("?")[1],
          question: texte ?? undefined,
          ...(voix ? { voix: true } : {}),
          ...(historique.length ? { historique } : {}),
        }),
      });
      const json = (await r.json().catch(() => ({}))) as { texte?: string; erreur?: string; secours?: boolean };
      maj = r.ok && json.texte ? { reponse: json.texte, secours: json.secours === true } : { erreur: json.erreur ?? "L'assistant IA ne répond pas pour le moment." };
      break;
    } catch {
      maj = { erreur: "Pas de connexion : l'assistant IA est injoignable." };
      if (essai === 0) await new Promise((ok) => setTimeout(ok, 1200));
    }
    }
    setFil((f) => f.map((x) => (x.id === m.id ? { ...x, ...maj } : x)));
    setAttente(false);
  };

  const soumettre = (e: FormEvent) => {
    e.preventDefault();
    if (question.trim()) void envoyer(question.trim());
  };
  const derniere = [...fil].reverse().find((x) => x.reponse);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {fil.length === 0 && (
          <button type="button" onClick={() => void envoyer(null)} disabled={attente} className="h-11 rounded-full bg-orange px-5 text-[15px] font-bold text-ink disabled:opacity-60">
            Expliquer simplement
          </button>
        )}
        {/* Comparer en un toucher avec les autres rotations de la parcelle. */}
        {autres.map((a) => (
          <button key={a} type="button" disabled={attente} onClick={() => void envoyer(`Compare la rotation ${id} avec la rotation ${a} pour ma parcelle : laquelle convient le mieux, et pourquoi ?`)} className="h-11 rounded-full border border-ink px-4 text-[15px] font-bold disabled:opacity-60">
            {`Comparer avec ${a}`}
          </button>
        ))}
        {autres.length > 1 && (
          <button type="button" disabled={attente} onClick={() => void envoyer("Entre les trois rotations, laquelle me conseilles-tu pour ma parcelle, et pourquoi ?")} className="h-11 rounded-full border border-ink px-4 text-[15px] font-bold disabled:opacity-60">
            Laquelle choisir ?
          </button>
        )}
      </div>

      {fil.length > 0 && (
        <ol aria-label="Conversation avec l'assistant" aria-live="polite" aria-busy={attente} className="m-0 flex list-none flex-col gap-3 p-0">
          {fil.map((x) => (
            <li key={x.id} className="flex flex-col gap-2">
              <div className="bulle-moi flex max-w-[85%] flex-col gap-0.5 self-end rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-paper">
                {x.voix && <span className="text-xs font-semibold text-[#FFB066]">Dit à voix haute</span>}
                <span className="text-[15px] leading-normal">{x.question ?? EXPLIQUER}</span>
              </div>
              {x.reponse && (
                <div className="bulle-ia flex max-w-[92%] flex-col gap-2 self-start rounded-2xl rounded-bl-md bg-[#F4F6F1] p-4">
                  <p className="m-0 whitespace-pre-line text-base leading-relaxed">{x.reponse}</p>
                  {x.secours && <span className="text-xs text-muted">Réponse préparée par ForoSat à partir de ses données (l&apos;IA était très sollicitée).</span>}
                  <LireAVoixHaute texte={x.reponse} />
                </div>
              )}
              {x.erreur && <p role="alert" className="bulle-ia m-0 self-start rounded-2xl bg-[#FDE7CC] p-4 text-[15px] text-[#5C2E00]">{x.erreur}</p>}
              {!x.reponse && !x.erreur && (
                <p className="bulle-ia m-0 flex items-center gap-2 self-start rounded-2xl rounded-bl-md bg-[#F4F6F1] px-4 py-3 text-[15px] text-muted">
                  <span className="points-attente flex items-center gap-1" aria-hidden="true"><span /><span /><span /></span>
                  L&apos;IA rédige sa réponse…
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
      <div ref={bas} />

      <form onSubmit={soumettre} className="flex flex-col gap-2">
        <label htmlFor="question-ia" className="text-sm font-semibold">{fil.length ? "Votre question suivante" : "Votre question sur cette rotation"}</label>
        <div className="flex flex-wrap gap-2">
          <input id="question-ia" value={question} maxLength={300} onChange={(e) => setQuestion(e.target.value)} placeholder="Ex. Et si la pluie s'arrête en août ?" className="h-12 min-w-0 flex-[1_1_240px] rounded-full border border-line bg-white px-4 text-base" />
          {/* Dite à voix haute, la question part directement à l'assistant, comme un message. */}
          <DicteeVocale onTexte={(t) => void envoyer(t, true)} moteur={moteurDictee} />
          <button type="submit" disabled={attente || !question.trim()} className="h-12 rounded-full bg-ink px-5 text-base font-bold text-paper disabled:opacity-60">Demander</button>
        </div>
      </form>
      {derniere && <p className="m-0 text-xs text-muted">Textes rédigés par une IA à partir des données ForoSat. Le score vient des règles agronomiques, pas de l&apos;IA. Vérifiez avec un conseiller agricole.</p>}
    </div>
  );
}
