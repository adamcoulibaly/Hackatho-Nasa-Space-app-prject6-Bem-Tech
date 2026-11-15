"use client";

import { useEffect, useState } from "react";
import { useParcelle } from "@/lib/parcelle/context";
import { cleContour, conseilPente, LIBELLE_CLASSE, type Pente } from "@/lib/pente";

const virgule = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
const COULEUR: Record<Pente["classe"], string> = { faible: "#009E60", modere: "#F2C230", fort: "#F77F00", "tres-fort": "#C2410C" };

/**
 * Pente de la parcelle dessinée, calculée sur l'altitude SRTM dès que le contour est fermé ou ajusté,
 * et gardée avec la parcelle (les rotations en tiennent compte pour l'anti-érosion).
 */
export function PenteParcelle() {
  const { parcelle, setParcelle } = useParcelle();
  const contour = parcelle.contour && parcelle.contour.length >= 3 ? parcelle.contour : null;
  const cle = contour ? cleContour(contour) : null;
  const [etat, setEtat] = useState<"repos" | "calcul" | "erreur">("repos");

  useEffect(() => {
    if (!contour || !cle || parcelle.pente?.cle === cle) return;
    const arret = new AbortController();
    setEtat("calcul");
    fetch("/api/pente", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contour }), signal: arret.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const p = (await r.json()) as Pente;
        setParcelle({ pente: { moyenne: p.moyenne, forte: p.forte, altitudeMin: p.altitudeMin, altitudeMax: p.altitudeMax, classe: p.classe, cle } });
        setEtat("repos");
      })
      .catch(() => { if (!arret.signal.aborted) setEtat("erreur"); });
    return () => arret.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);

  if (!contour) return null;
  const pente = parcelle.pente?.cle === cle ? parcelle.pente : null;
  if (!pente) {
    return (
      <p role="status" data-guide="pente" className="m-0 rounded-2xl bg-white px-4 py-3 text-sm text-muted">
        {etat === "erreur" ? "Pente indisponible pour l'instant (connexion ?). Elle sera calculée au prochain ajustement du contour." : "Calcul de la pente de votre parcelle (altitude SRTM)…"}
      </p>
    );
  }
  return (
    <section data-testid="pente-parcelle" data-guide="pente" aria-label="Pente de la parcelle" className="flex flex-col gap-2 rounded-2xl bg-white p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ background: COULEUR[pente.classe] }} />
        <strong className="text-[15px]">{LIBELLE_CLASSE[pente.classe]} · {virgule(pente.moyenne)} % en moyenne</strong>
        <span className="text-sm text-muted">jusqu&apos;à {virgule(pente.forte)} % · altitude {pente.altitudeMin}–{pente.altitudeMax} m</span>
      </div>
      <p className="m-0 text-sm leading-normal">{conseilPente({ ...pente, points: 0 })}</p>
      <p className="m-0 text-xs text-muted">Altitude SRTM (NASA), pixel d&apos;environ 20 m : la pente générale du champ, pas chaque billon.</p>
    </section>
  );
}
