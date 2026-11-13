"use client";

import Link from "next/link";
import type { Culture, Rotation, Saisons } from "@/lib/contract";
import type { Anomalie } from "@/lib/satellite/anomalie";
import type { Observation } from "@/lib/carnet";
import type { Semis } from "./Tableau";
import { calendrierCulture, etapeDuJour, semisHabituel } from "@/lib/moteur/calendrier-agricole";
import { prochaineCulture } from "@/lib/whatsapp";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const dateLisible = (iso: string) => {
  const [, m, j] = iso.split("-").map(Number);
  return `${j === 1 ? "1er" : j} ${MOIS[m - 1]}`;
};
const VIGILANCE = { faible: "Vigilance faible", moyen: "Vigilance moyenne", eleve: "Vigilance élevée" } as const;
const ETAT = { bonne: "bon", moyenne: "moyen", mauvaise: "mauvais" } as const;

function Tuile({ id, titre, href, lien, children }: { id: string; titre: string; href: string; lien: string; children: React.ReactNode }) {
  return (
    <li data-testid={id} className="flex flex-col gap-2 rounded-3xl bg-white p-5">
      <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">{titre}</span>
      <div className="flex flex-col gap-1 text-[15px] leading-normal">{children}</div>
      <Link href={href} className="mt-auto self-start text-sm font-bold">{lien} →</Link>
    </li>
  );
}

/**
 * Le « jumeau » de la parcelle : en un écran, ce que ForoSat sait d'elle aujourd'hui, avec les mêmes calculs que les
 * autres pages (calendrier, alertes, végétation, carnet, rotations), et sans rien inventer quand une donnée manque.
 */
export function MaParcelleAujourdhui({ region, reco, cultures, saisons, saisonRegion, semis, anomalie, derniere, aujourdhui }: {
  region: string; reco: Rotation; cultures: Culture[]; saisons: Saisons | null; saisonRegion: { debut: number; fin: number };
  semis?: Semis; anomalie: Anomalie | null; derniere: Observation | null; aujourdhui: string;
}) {
  const { culture } = prochaineCulture(reco);
  const fiche = cultures.find((c) => c.nom === culture);
  const annee = Number(aujourdhui.slice(0, 4));
  const pluies = semis?.etat === "fenetre_ouverte" && semis.depuis?.startsWith(String(annee)) ? semis.depuis : null;
  const dateSemis = pluies ?? semisHabituel(saisons, culture, annee, saisonRegion).date;
  const etape = fiche ? etapeDuJour(calendrierCulture(fiche, dateSemis), aujourdhui) : null;
  return (
    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4 p-0">
      <Tuile id="jour-calendrier" titre="Calendrier" href="/calendrier" lien="Mon calendrier">
        <strong>{`${culture} · semis ${pluies ? "possible depuis le" : "habituel vers le"} ${dateLisible(dateSemis)}`}</strong>
        {etape ? <span>{`Étape du jour : ${etape.label}. ${etape.conseil}`}</span> : <span className="text-muted">Pas d&apos;étape en cours pour cette culture à cette date : la prochaine saison se prépare.</span>}
      </Tuile>
      <Tuile id="jour-vigilance" titre="Vigilance" href="/tableau" lien="Alertes du jour">
        {semis?.risque ? (
          <>
            <strong>{VIGILANCE[semis.risque]}</strong>
            <span>{semis.alertes?.length ? semis.alertes.map((a) => a.message).join(" ") : semis.message}</span>
            <span className="text-xs text-muted">{`Observé jusqu'au ${dateLisible(semis.dateDonnees)} (NASA POWER) : ce n'est pas une prévision météo.`}</span>
          </>
        ) : (
          <span className="text-muted">Les mesures du jour ne sont pas encore disponibles (connexion ou données NASA).</span>
        )}
      </Tuile>
      <Tuile id="jour-vegetation" titre="Végétation vue par satellite" href={anomalie ? "/climat" : "/parcelle"} lien={anomalie ? "Voir les couches NASA" : "Dessiner ma parcelle"}>
        {anomalie ? (
          <>
            <strong>{anomalie.message}</strong>
            <span className="text-xs text-muted">{`NDVI MODIS ${anomalie.ndvi.toFixed(2)} contre ${anomalie.habituel.toFixed(2)} d'habitude (${anomalie.mois}).`}</span>
          </>
        ) : (
          <span className="text-muted">Dessinez le contour de votre champ pour suivre sa végétation mois par mois.</span>
        )}
      </Tuile>
      <Tuile id="jour-observation" titre="Dernière observation" href="/suivi" lien={derniere ? "Mon carnet" : "Noter une observation"}>
        {derniere ? (
          <>
            <strong>{`${dateLisible(derniere.date)} · ${derniere.culture} : ${derniere.type === "recolte" ? `récolte ${derniere.recolte ?? ""}` : `état ${ETAT[derniere.etat]}`}`}</strong>
            {derniere.note && <span>{derniere.note}</span>}
          </>
        ) : (
          <span className="text-muted">Aucune observation dans votre carnet pour l&apos;instant.</span>
        )}
      </Tuile>
      <Tuile id="jour-rotation" titre="Rotation conseillée" href="/rotations" lien="Comparer les rotations">
        <strong>{`Rotation ${reco.id} · ${reco.sequence.join(" → ")}`}</strong>
        <span>{reco.note}</span>
      </Tuile>
      <li className="flex items-center rounded-3xl border border-line p-5 text-sm text-muted">{`Parcelle en ${region}. Toutes ces informations viennent des mêmes calculs que les autres pages de ForoSat.`}</li>
    </ul>
  );
}
