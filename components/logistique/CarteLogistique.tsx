"use client";
// Carte du réseau : le fournisseur de tuiles se change par configuration, sans toucher aux écrans.
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

export type PointCarte = { id: string; lat: number; lng: number; type: "depart" | "arrivee" | "livreur"; libelle: string; perime?: boolean };
const TUILES = process.env.NEXT_PUBLIC_CARTE_TUILES || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = process.env.NEXT_PUBLIC_CARTE_ATTRIBUTION || "© OpenStreetMap";
const COULEUR = { depart: "#111111", arrivee: "#2fbf71", livreur: "#EDA900" };

export function CarteLogistique({ points, trace = [], route = null, hauteur = 320 }: { points: PointCarte[]; trace?: [number, number][]; route?: [number, number][] | null; hauteur?: number }) {
  const div = useRef<HTMLDivElement>(null);
  const carte = useRef<any>(null);
  const couche = useRef<any>(null);
  const lib = useRef<any>(null);

  const dessiner = () => {
    const L = lib.current;
    if (!L || !carte.current) return;
    couche.current.clearLayers();
    if (trace.length > 1) L.polyline(trace, { color: "#EDA900", weight: 4, opacity: .85 }).addTo(couche.current);
    if (route && route.length > 1) L.polyline(route, { color: "#111111", weight: 4, opacity: .55, dashArray: "8 8" }).addTo(couche.current);
    for (const p of points) {
      const c = COULEUR[p.type];
      const icon = L.divIcon({ className: "", iconSize: [18, 18], iconAnchor: [9, 9], html: `<span style="display:block;width:18px;height:18px;border-radius:50%;background:${c};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4);opacity:${p.perime ? .45 : 1}"></span>` });
      const m = L.marker([p.lat, p.lng], { icon, title: p.libelle }).addTo(couche.current);
      const t = document.createElement("span"); t.textContent = p.libelle; m.bindPopup(t);
    }
    const b = [...points.map((p) => [p.lat, p.lng] as [number, number]), ...trace, ...(route ?? [])];
    if (b.length > 1) carte.current.fitBounds(b, { padding: [32, 32], maxZoom: 15 });
    else if (b.length === 1) carte.current.setView(b[0], 14);
  };

  useEffect(() => {
    let fin = false;
    import("leaflet").then((m) => {
      if (fin || !div.current || carte.current) return;
      lib.current = m.default ?? m;
      carte.current = lib.current.map(div.current, { center: [4.05, 9.7], zoom: 11, scrollWheelZoom: false });
      lib.current.tileLayer(TUILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(carte.current);
      couche.current = lib.current.layerGroup().addTo(carte.current);
      dessiner();
    });
    return () => { fin = true; carte.current?.remove(); carte.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(dessiner, [JSON.stringify(points), trace.length, route?.length]);
  return <div ref={div} role="img" aria-label="Carte de la livraison" style={{ height: hauteur, width: "100%", borderRadius: 12, overflow: "hidden", isolation: "isolate", background: "#e8e8e6" }} />;
}
