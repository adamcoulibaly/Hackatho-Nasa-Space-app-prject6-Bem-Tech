"use client";

import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Couche } from "@/lib/contract";
import { anneeDisponible, gibsTileUrl, lireNominatimListe, nominatimUrl, surfaceHa, type Lieu } from "@/lib/carte";
import { regionLaPlusProche, regionParId } from "@/lib/regions";
import { useParcelle } from "@/lib/parcelle/context";
import { ecouterNatif, envoyerAuNatif } from "@/lib/modeApp";

type Point = [number, number];
type Fond = "satellite" | "plan";

const ORANGE = "#F77F00";
const BTN = "inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold disabled:opacity-50";
const ANNEE_MAX = 2025;
const ZOOM_DESSIN = 16;
const FONDS: Record<Fond, { url: string; attribution: string; maxNativeZoom: number }> = {
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Images &copy; Esri, Maxar, Earthstar Geographics",
    maxNativeZoom: 18,
  },
  plan: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxNativeZoom: 19,
  },
};

const ha = (n: number) => `${(Math.round(n * 100) / 100).toLocaleString("fr-FR")} ha`;
const centreDe = (pts: Point[]): Point => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];

export function CarteParcelle({ couches }: { couches: Couche[] }) {
  const { parcelle, setParcelle } = useParcelle();
  const conteneur = useRef<HTMLDivElement>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const carte = useRef<Leaflet.Map | null>(null);
  const fondCouche = useRef<Leaflet.TileLayer | null>(null);
  const surcouche = useRef<Leaflet.TileLayer | null>(null);
  const dessin = useRef<Leaflet.LayerGroup | null>(null);
  const modeDessin = useRef(false);
  const regionVue = useRef(parcelle.region);

  const [prete, setPrete] = useState(false);
  const [fond, setFond] = useState<Fond>("satellite");
  const [nasaId, setNasaId] = useState<Couche["id"] | "aucune">("aucune");
  const [annee, setAnnee] = useState(2024);
  const [dessine, setDessine] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);
  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState<Lieu[]>([]);
  const [message, setMessage] = useState("");

  const nasa = couches.find((c) => c.id === nasaId) ?? null;

  // Création de la carte, une seule fois, côté navigateur.
  useEffect(() => {
    let detruite = false;
    let ro: ResizeObserver | null = null;
    (async () => {
      const mod = await import("leaflet");
      const lf = (mod as unknown as { default?: typeof Leaflet }).default ?? (mod as unknown as typeof Leaflet);
      if (detruite || !conteneur.current) return;
      L.current = lf;
      const r = regionParId(parcelle.region);
      const m = lf.map(conteneur.current, { center: r ? [r.lat, r.lon] : [9.458, -5.6316], zoom: 11, zoomSnap: 0.5 });
      if (parcelle.contour && parcelle.contour.length >= 3) m.fitBounds(lf.latLngBounds(parcelle.contour), { padding: [40, 40], maxZoom: 17 });
      dessin.current = lf.layerGroup().addTo(m);
      m.on("click", (e: Leaflet.LeafletMouseEvent) => {
        if (modeDessin.current) setPoints((p) => [...p, [e.latlng.lat, e.latlng.lng]]);
      });
      carte.current = m;
      // La carte suit les changements de taille (rotation du téléphone, colonne qui se replie).
      ro = new ResizeObserver(() => m.invalidateSize());
      ro.observe(conteneur.current);
      setPrete(true);
    })();
    return () => {
      detruite = true;
      ro?.disconnect();
      carte.current?.remove();
      carte.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Curseur en croix pendant le dessin. Ne jamais changer la classe du conteneur par React :
  // cela effacerait les classes posées par Leaflet (et les tuiles perdraient leurs styles).
  useEffect(() => {
    const lf = L.current;
    const m = carte.current;
    if (!prete || !lf || !m) return;
    if (dessine) lf.DomUtil.addClass(m.getContainer(), "leaflet-crosshair");
    else lf.DomUtil.removeClass(m.getContainer(), "leaflet-crosshair");
  }, [prete, dessine]);

  // Fond : satellite détaillé (pour voir les champs) ou plan.
  useEffect(() => {
    const lf = L.current;
    const m = carte.current;
    if (!prete || !lf || !m) return;
    fondCouche.current?.remove();
    const f = FONDS[fond];
    fondCouche.current = lf.tileLayer(f.url, { maxNativeZoom: f.maxNativeZoom, maxZoom: 19, attribution: f.attribution }).addTo(m);
    fondCouche.current.bringToBack();
  }, [prete, fond]);

  // Couche NASA GIBS de l'année choisie, par-dessus le fond.
  useEffect(() => {
    const lf = L.current;
    const m = carte.current;
    if (!prete || !lf || !m) return;
    surcouche.current?.remove();
    surcouche.current = null;
    if (nasa && anneeDisponible(nasa, annee)) {
      surcouche.current = lf
        .tileLayer(gibsTileUrl(nasa, annee), {
          maxNativeZoom: nasa.gibs.niveau,
          maxZoom: 19,
          opacity: nasa.opacite,
          attribution: '<a href="https://earthdata.nasa.gov/gibs">NASA GIBS</a>',
        })
        .addTo(m);
    }
  }, [prete, nasa, annee]);

  // Changement de région dans le formulaire : la carte s'y rend, sauf si la parcelle s'y trouve déjà.
  useEffect(() => {
    const m = carte.current;
    if (!prete || !m || parcelle.region === regionVue.current) return;
    regionVue.current = parcelle.region;
    const c = parcelle.contour;
    if (c && c.length >= 3 && regionLaPlusProche(...centreDe(c)).id === parcelle.region) return;
    const r = regionParId(parcelle.region);
    if (r) m.flyTo([r.lat, r.lon], 11, { duration: 0.3 });
  }, [prete, parcelle.region, parcelle.contour]);

  // Tracé : contour en cours (avec fermeture en pointillés) ou contour enregistré aux coins déplaçables.
  useEffect(() => {
    const lf = L.current;
    const g = dessin.current;
    if (!prete || !lf || !g) return;
    g.clearLayers();

    if (dessine) {
      if (points.length >= 2) lf.polyline(points, { color: ORANGE, weight: 3 }).addTo(g);
      if (points.length >= 3) lf.polyline([points[points.length - 1], points[0]], { color: ORANGE, weight: 2, dashArray: "6 6" }).addTo(g);
      points.forEach((p, i) => {
        const sommet = lf.circleMarker(p, {
          radius: i === 0 && points.length >= 3 ? 9 : 6,
          color: ORANGE,
          fillColor: i === 0 && points.length >= 3 ? ORANGE : "#FFFFFF",
          fillOpacity: 1,
          weight: 3,
          bubblingMouseEvents: false,
        }).addTo(g);
        if (i === 0) sommet.on("click", () => terminerRef.current());
      });
      return;
    }

    const contour = parcelle.contour;
    if (!contour || contour.length < 3) return;
    const poly = lf.polygon(contour, { color: ORANGE, weight: 3, fillOpacity: 0.15 }).addTo(g);
    const courant = contour.map((p) => [...p] as Point);
    contour.forEach((p, i) => {
      const coin = lf
        .marker(p, { draggable: true, icon: lf.divIcon({ className: "forosat-sommet", iconSize: [18, 18] }), title: `Coin ${i + 1} : glisser pour ajuster` })
        .addTo(g);
      coin.on("drag", (e: Leaflet.LeafletEvent) => {
        const ll = (e.target as Leaflet.Marker).getLatLng();
        courant[i] = [ll.lat, ll.lng];
        poly.setLatLngs(courant);
        setMessage(`Surface : ${ha(surfaceHa(courant))}`);
      });
      coin.on("dragend", () => {
        const s = Math.round(surfaceHa(courant) * 100) / 100;
        setParcelle({ contour: courant, surface: s, centre: centreDe(courant) });
        setMessage(`Contour ajusté : ${ha(s)}.`);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prete, points, dessine, parcelle.contour]);

  const commencer = () => {
    const m = carte.current;
    modeDessin.current = true;
    setDessine(true);
    setPoints([]);
    setResultats([]);
    if (fond !== "satellite") setFond("satellite");
    m?.doubleClickZoom.disable();
    if (m && m.getZoom() < ZOOM_DESSIN) m.setZoom(ZOOM_DESSIN);
    setMessage("Touchez la carte à chaque coin de votre champ. Pour fermer, touchez le premier point.");
  };

  const terminer = () => {
    setPoints((pts) => {
      if (pts.length < 3) {
        setMessage("Placez au moins 3 points pour fermer le contour.");
        return pts;
      }
      const s = Math.round(surfaceHa(pts) * 100) / 100;
      const centre = centreDe(pts);
      const region = regionLaPlusProche(...centre);
      setParcelle({ surface: s, contour: pts, centre, region: region.id });
      regionVue.current = region.id;
      modeDessin.current = false;
      carte.current?.doubleClickZoom.enable();
      setDessine(false);
      setMessage(`Parcelle enregistrée : ${ha(s)}. Région détectée : ${region.nom} (modifiable dans le formulaire). Glissez un coin pour ajuster.`);
      return [];
    });
  };
  const terminerRef = useRef(terminer);
  terminerRef.current = terminer;

  const retirer = () => setPoints((p) => p.slice(0, -1));
  const annuler = () => {
    modeDessin.current = false;
    carte.current?.doubleClickZoom.enable();
    setDessine(false);
    setPoints([]);
    setMessage("");
  };
  const effacer = () => {
    setParcelle({ contour: undefined, centre: undefined });
    setMessage("Contour effacé.");
  };

  const chercher = async (e: FormEvent) => {
    e.preventDefault();
    const q = recherche.trim();
    if (!q) return;
    setMessage("Recherche…");
    setResultats([]);
    try {
      const r = await fetch(nominatimUrl(q));
      const lieux = lireNominatimListe(await r.json());
      if (lieux.length === 0) return setMessage(`Aucun lieu trouvé pour « ${q} ».`);
      if (lieux.length === 1) return aller(lieux[0]);
      setResultats(lieux);
      setMessage(`${lieux.length} lieux trouvés : choisissez le bon.`);
    } catch {
      setMessage("La recherche est indisponible pour l'instant. Déplacez la carte à la main.");
    }
  };
  const aller = (lieu: Lieu) => {
    const m = carte.current;
    if (m) lieu.cadre ? m.flyToBounds(lieu.cadre, { maxZoom: 15, duration: 0.3 }) : m.flyTo([lieu.lat, lieu.lon], 14, { duration: 0.3 });
    setResultats([]);
    setMessage(lieu.nom);
  };
  // Position renvoyée par l'app mobile (GPS natif).
  useEffect(
    () =>
      ecouterNatif((m) => {
        if (m.type !== "position") return;
        if ("erreur" in m) return setMessage("Position refusée ou indisponible. Cherchez votre village à la place.");
        carte.current?.flyTo([m.lat, m.lon], 17, { duration: 0.3 });
        setMessage("Carte centrée sur votre position. Vous pouvez dessiner votre champ.");
      }),
    [],
  );

  const maPosition = () => {
    if (envoyerAuNatif({ type: "position" })) return setMessage("Recherche de votre position…");
    if (!("geolocation" in navigator)) return setMessage("Ce navigateur ne donne pas la position.");
    setMessage("Recherche de votre position…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        carte.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 17, { duration: 0.3 });
        setMessage("Carte centrée sur votre position. Vous pouvez dessiner votre champ.");
      },
      () => setMessage("Position refusée ou indisponible. Cherchez votre village à la place."),
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  const surfaceEnCours = points.length >= 3 ? surfaceHa(points) : 0;
  const aContour = !!parcelle.contour && parcelle.contour.length >= 3;

  return (
    <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <form onSubmit={chercher} role="search" className="flex min-w-0 flex-[1_1_260px] gap-2">
          <label htmlFor="lieu" className="sr-only">Rechercher une localité</label>
          <input id="lieu" type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Village, ville… (ex. Napié)" className="h-11 min-w-0 flex-grow rounded-full border border-line bg-white px-4 text-base" />
          <button type="submit" className={`${BTN} bg-ink text-paper`}>Rechercher</button>
        </form>
        <button type="button" onClick={maPosition} className={`${BTN} border border-line bg-white text-ink`}>Ma position</button>
      </div>

      {resultats.length > 0 && (
        <ul className="fade-in m-0 flex list-none flex-col gap-1 rounded-2xl bg-white p-2" aria-label="Lieux trouvés">
          {resultats.map((l) => (
            <li key={`${l.lat},${l.lon}`}>
              <button type="button" onClick={() => aller(l)} className="min-h-11 w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-paper">{l.nom}</button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
      <div className="relative isolate overflow-hidden rounded-[28px] bg-[#0B1A13]">
        <div ref={conteneur} data-testid="carte" aria-label="Carte de la parcelle" role="region" className="h-[420px] w-full md:h-[560px]" />
        <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex justify-end">
          <div role="group" aria-label="Fond de carte" className="pointer-events-auto flex gap-1 rounded-full bg-ink/90 p-1">
            {(["satellite", "plan"] as Fond[]).map((f) => (
              <button key={f} type="button" aria-pressed={fond === f} onClick={() => setFond(f)} className={`h-10 rounded-full px-3.5 text-[13px] font-bold ${fond === f ? "bg-paper text-ink" : "text-paper"}`}>
                {f === "satellite" ? "Satellite" : "Plan"}
              </button>
            ))}
          </div>
        </div>
      </div>
        {dessine && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-ink/90 p-2 text-paper md:absolute md:inset-x-3 md:bottom-3 md:z-[500] md:mt-0">
            <span className="px-2 text-sm">{points.length} point{points.length > 1 ? "s" : ""}{surfaceEnCours ? ` · ≈ ${ha(surfaceEnCours)}` : ""}</span>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={retirer} disabled={points.length === 0} className={`${BTN} bg-transparent text-paper ring-1 ring-[#2A4234]`}>Retirer le dernier point</button>
              <button type="button" onClick={annuler} className={`${BTN} bg-transparent text-paper ring-1 ring-[#2A4234]`}>Annuler</button>
              <button type="button" onClick={() => terminerRef.current()} disabled={points.length < 3} className={`${BTN} bg-orange text-ink`}>Terminer le contour ({points.length} points)</button>
            </div>
          </div>
        )}
      </div>

      {!dessine && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={commencer} className={`${BTN} bg-ink text-paper`}>{aContour ? "Redessiner ma parcelle" : "Dessiner ma parcelle"}</button>
          {aContour && <button type="button" onClick={effacer} className={`${BTN} border border-line bg-white text-ink`}>Effacer le contour</button>}
        </div>
      )}

      <p aria-live="polite" className="m-0 min-h-[1.5em] text-sm text-muted">{message}</p>

      <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-ink p-3 text-paper">
        <div role="group" aria-label="Couche NASA" className="flex flex-wrap gap-1">
          {[{ id: "aucune" as const, label: "Sans couche NASA" }, ...couches.filter((c) => c.id !== "couleurs")].map((c) => (
            <button key={c.id} type="button" aria-pressed={c.id === nasaId} onClick={() => setNasaId(c.id)} className={`h-11 rounded-full px-3.5 text-[13px] font-bold ${c.id === nasaId ? "bg-paper text-ink" : "bg-transparent text-paper"}`}>
              {c.label}
            </button>
          ))}
        </div>
        {nasa && (
          <>
            <label htmlFor="annee" className="flex min-h-11 flex-grow items-center gap-2.5 text-[13px]">
              <span>Année <strong className="font-display">{annee}</strong></span>
              <input id="annee" type="range" min={2005} max={ANNEE_MAX} value={annee} onChange={(e) => setAnnee(Number(e.target.value))} className="h-11 min-w-[120px] flex-grow accent-orange" />
            </label>
            <span className="text-[13px] text-[#C9D4CD]">
              {anneeDisponible(nasa, annee) ? `${nasa.source} · ${nasa.echelle}` : `${nasa.source} : données à partir de ${nasa.gibs.depuis}`}
            </span>
          </>
        )}
      </div>
      <p className="m-0 text-xs text-muted">Le contour de votre champ reste sur cet appareil : il n'est envoyé nulle part.</p>
    </div>
  );
}
