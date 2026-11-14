"use client";

import { useState, type FormEvent } from "react";
import type { Parcelle } from "@/lib/parcelle/validate";
import { lienFiche } from "@/lib/moteur/fiche-lien";
import { LireAVoixHaute } from "./LireAVoixHaute";
import { DicteeVocale } from "./DicteeVocale";
import { exigerInternet, messageHorsLigne } from "@/lib/enLigne";

type Etat = { statut: "repos" } | { statut: "attente" } | { statut: "ok"; texte: string } | { statut: "erreur"; message: string };

export function AssistantIA({ id, parcelle }: { id: "A" | "B" | "C"; parcelle: Parcelle }) {
  const [question, setQuestion] = useState("");
  const [etat, setEtat] = useState<Etat>({ statut: "repos" });

  const demander = async (avecQuestion: boolean) => {
    if (!exigerInternet("l'assistant IA")) return setEtat({ statut: "erreur", message: messageHorsLigne("l'assistant IA") });
    setEtat({ statut: "attente" });
    try {
      const r = await fetch("/api/ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, params: lienFiche(id, parcelle).split("?")[1], question: avecQuestion ? question.trim() || undefined : undefined }),
      });
      const json = (await r.json().catch(() => ({}))) as { texte?: string; erreur?: string };
      if (r.ok && json.texte) setEtat({ statut: "ok", texte: json.texte });
      else setEtat({ statut: "erreur", message: json.erreur ?? "L'assistant IA ne répond pas pour le moment." });
    } catch {
      setEtat({ statut: "erreur", message: "Pas de connexion : l'assistant IA est injoignable." });
    }
  };
  const envoyer = (e: FormEvent) => {
    e.preventDefault();
    if (question.trim()) demander(true);
  };
  const attente = etat.statut === "attente";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => demander(false)} disabled={attente} className="h-12 rounded-full bg-orange px-5 text-base font-bold text-ink disabled:opacity-60">
          Expliquer simplement
        </button>
      </div>
      <form onSubmit={envoyer} className="flex flex-col gap-2">
        <label htmlFor="question-ia" className="text-sm font-semibold">Votre question sur cette rotation</label>
        <div className="flex flex-wrap gap-2">
          <input id="question-ia" value={question} maxLength={300} onChange={(e) => setQuestion(e.target.value)} placeholder="Ex. Et si la pluie s'arrête en août ?" className="h-12 min-w-0 flex-[1_1_240px] rounded-full border border-line bg-white px-4 text-base" />
          <DicteeVocale onTexte={setQuestion} />
          <button type="submit" disabled={attente || !question.trim()} className="h-12 rounded-full bg-ink px-5 text-base font-bold text-paper disabled:opacity-60">Demander</button>
        </div>
      </form>

      <div aria-live="polite" aria-busy={attente}>
        {attente && <p className="m-0 text-[15px] text-muted">L'IA rédige sa réponse…</p>}
        {etat.statut === "ok" && (
          <div className="fade-in flex flex-col gap-2 rounded-2xl bg-[#F4F6F1] p-4">
            <p className="m-0 whitespace-pre-line text-base leading-relaxed">{etat.texte}</p>
            <LireAVoixHaute texte={etat.texte} />
            <p className="m-0 text-xs text-muted">Texte rédigé par une IA à partir des données ForoSat. Le score vient des règles agronomiques, pas de l'IA. Vérifiez avec un conseiller agricole.</p>
          </div>
        )}
        {etat.statut === "erreur" && (
          <p role="alert" className="m-0 rounded-2xl bg-[#FDE7CC] p-4 text-[15px] text-[#5C2E00]">{etat.message}</p>
        )}
      </div>
    </div>
  );
}
