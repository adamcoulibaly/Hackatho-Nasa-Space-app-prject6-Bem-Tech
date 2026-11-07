"use client";

import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Couche } from "@/lib/contract";
import { anneeDisponible, gibsTileUrl, KORHOGO, lireNominatim, nominatimUrl, surfaceHa } from "@/lib/carte";
import { useParcelle } from "@/lib/parcelle/context";

type Point = [number, number];
const ORANGE = "#F77F00";
const BTN = "inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold";
const ANNEE_MAX = 2025;

export function CarteParcelle({ couches }: { couches: Couche[] }) {
  const { parcelle, setParcelle } = useParcelle();
  const conteneur = useRef<HTMLDivElement>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const carte = useRef<Leaflet.Map | null>(null);
  const dessin = useRef<Leaflet.LayerGroup | null>(null);
  const surcouche = useRef<Leaflet.TileLayer | null>(null);
  const modeDessin = useRef(false);

  const [prete, setPrete] = useState(false);
  const [coucheId, setCoucheId] = useState<Couche["id"] | "plan">("veg");
  const [annee, setAnnee] = useState(2024);
  const [dessine, setDessine] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);
  const [recherche, setRecherche] = useState("");
  const [message, setMessage] = useState("");

  const couche = couches.find((c) => c.id === coucheId) ?? null;

  // Création de la carte (une seule fois, côté navigateur).
  useEffect(() => {
    let detruite = false;
    (async () => {
      const mod = await import("leaflet");
      const lf = (mod as unknown as { default?: typeof Leaflet }).default ?? (mod as unknown as typeof Leaflet);
      if (detruite || !conteneur.current) return;
      L.current = lf;
      const m = lf.map(conteneur.current, { center: parcelle.centre ?? KORHOGO, zoom: parcelle.centre ? 15 : 12 });
      lf.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      dessin.current = lf.layerGroup().addTo(m);
      m.on("click", (e: Leaflet.LeafletMouseEvent) => {
        if (modeDessin.current) setPoints((p) => [...p, [e.latlng.lat, e.latlng.lng]]);
      });
      carte.current = m;
      setPrete(true);
    })();
    return () => {
      detruite = true;
      carte.current?.remove();
      carte.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Couche NASA GIBS de l'année choisie.
  useEffect(() => {
    const lf = L.current;
    const m = carte.current;
    if (!prete || !lf || !m) return;
    surcouche.current?.remove();
    surcouche.current = null;
    if (couche && anneeDisponible(couche, annee)) {
      surcouche.current = lf
        .tileLayer(gibsTileUrl(couche, annee), {
          maxNativeZoom: couche.gibs.niveau,
          maxZoom: 19,
          opacity: couche.opacite,
          attribution: '<a href="https://earthdata.nasa.gov/gibs">NASA GIBS</a>',
        })
        .addTo(m);
    }
  }, [prete, couche, annee]);

  // Contour en cours de dessin, ou contour enregistré.
  useEffect(() => {
    const lf = L.current;
    const g = dessin.current;
    if (!prete || !lf || !g) return;
    g.clearLayers();
    const contour = dessine ? points : parcelle.contour ?? [];
    if (contour.length >= 3 && !dessine) {
      lf.polygon(contour, { color: ORANGE, weight: 3, fillOpacity: 0.15 }).addTo(g);
    } else if (contour.length >= 2) {
      lf.polyline(contour, { color: ORANGE, weight: 3, dashArray: "6 6" }).addTo(g);
    }
    if (dessine) contour.forEach((p) => lf.circleMarker(p, { radius: 6, color: ORANGE, fillColor: "#FFFFFF", fillOpacity: 1, weight: 3 }).addTo(g));
  }, [prete, points, dessine, parcelle.contour]);

  const commencer = () => {
    modeDessin.current = true;
    setDessine(true);
    setPoints([]);
    setMessage("Touchez la carte à chaque coin de votre champ, puis terminez le contour.");
  };
  const terminer = () => {
    if (points.length < 3) {
      setMessage("Placez au moins 3 points pour fermer le contour.");
      return;
    }
    const ha = Math.round(surfaceHa(points) * 100) / 100;
    const centre: Point = [points.reduce((s, p) => s + p[0], 0) / points.length, points.reduce((s, p) => s + p[1], 0) / points.length];
    setParcelle({ surface: ha, contour: points, centre });
    modeDessin.current = false;
    setDessine(false);
    setMessage(`Parcelle enregistrée : ${ha.toLocaleString("fr-FR")} ha.`);
  };
  const annuler = () => {
    modeDessin.current = false;
    setDessine(false);
    setPoints([]);
    setMessage("");
  };

  const chercher = async (e: FormEvent) => {
    e.preventDefault();
    if (!recherche.trim()) return;
    setMessage("Recherche…");
    try {
      const r = await fetch(nominatimUrl(recherche.trim()));
      const lieu = lireNominatim(await r.json());
      if (!lieu) return setMessage(`Aucun lieu trouvé pour « ${recherche.trim()} ».`);
      carte.current?.flyTo([lieu.lat, lieu.lon], 14, { duration: 0.3 });
      setMessage(lieu.nom);
    } catch {
      setMessage("La recherche est indisponible pour l'instant. Déplacez la carte à la main.");
    }
  };
  const maPosition = () => {
    if (!("geolocation" in navigator)) return setMessage("Ce navigateur ne donne pas la position.");
    setMessage("Recherche de votre position…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        carte.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 16, { duration: 0.3 });
        setMessage("Carte centrée sur votre position.");
      },
      () => setMessage("Position refusée ou indisponible. Cherchez votre village à la place."),
      { timeout: 10000 },
    );
  };

  return (
    <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <form onSubmit={chercher} role="search" className="flex min-w-0 flex-[1_1_260px] gap-2">
          <label htmlFor="lieu" className="sr-only">Rechercher une localité</label>
          <input id="lieu" type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Ex. Korhogo, Bouaké, Daloa…" className="h-11 min-w-0 flex-grow rounded-full border border-line bg-white px-4 text-base" />
          <button type="submit" className={`${BTN} bg-ink text-paper`}>Rechercher</button>
        </form>
        <button type="button" onClick={maPosition} className={`${BTN} border border-line bg-white text-ink`}>Ma position</button>
        {dessine ? (
          <>
            <button type="button" onClick={terminer} className={`${BTN} bg-orange text-ink`}>Terminer le contour ({points.length} points)</button>
            <button type="button" onClick={annuler} className={`${BTN} border border-line bg-white text-ink`}>Annuler</button>
          </>
        ) : (
          <button type="button" onClick={commencer} className={`${BTN} bg-ink text-paper`}>Dessiner ma parcelle</button>
        )}
      </div>

      <div className="isolate overflow-hidden rounded-[28px] bg-[#0B1A13]">
        <div ref={conteneur} data-testid="carte" aria-label="Carte de la parcelle" role="region" className={`h-[380px] w-full md:h-[540px] ${dessine ? "cursor-crosshair" : ""}`} />
      </div>

      <p aria-live="polite" className="m-0 min-h-[1.5em] text-sm text-muted">{message}</p>

      <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-ink p-3 text-paper">
        <div role="group" aria-label="Couche de la carte" className="flex flex-wrap gap-1">
          {[{ id: "plan" as const, label: "Plan" }, ...couches].map((c) => (
            <button key={c.id} type="button" aria-pressed={c.id === coucheId} onClick={() => setCoucheId(c.id)} className={`h-11 rounded-full px-3.5 text-[13px] font-bold ${c.id === coucheId ? "bg-paper text-ink" : "bg-transparent text-paper"}`}>
              {c.label}
            </button>
          ))}
        </div>
        <label htmlFor="annee" className="flex min-h-11 flex-grow items-center gap-2.5 text-[13px]">
          <span>Année <strong className="font-display">{annee}</strong></span>
          <input id="annee" type="range" min={2005} max={ANNEE_MAX} value={annee} onChange={(e) => setAnnee(Number(e.target.value))} className="h-11 min-w-[120px] flex-grow accent-orange" />
        </label>
        <span className="text-[13px] text-[#C9D4CD]">
          {couche
            ? anneeDisponible(couche, annee)
              ? `${couche.source} · ${couche.echelle}`
              : `${couche.source} : données à partir de ${couche.gibs.depuis}`
            : "Fond OpenStreetMap"}
        </span>
      </div>
      <p className="m-0 text-xs text-muted">Le contour de votre champ reste sur cet appareil : il n'est envoyé nulle part.</p>
    </div>
  );
}
