"use client";
// Tournée du transporteur : l'ordre conseillé pour enchaîner enlèvements et livraisons.
import { useEffect, useState } from "react";
import { Route } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { CarteLogistique, type PointCarte } from "./CarteLogistique";

export function TourneeTransporteur({ fournisseurId, version }: { fournisseurId: string; version: string }) {
  const t = useT();
  const [r, setR] = useState<any>(null);
  useEffect(() => {
    let actif = true;
    fetch(`/api/logistique/fournisseurs/${fournisseurId}/tournee`).then((x) => (x.ok ? x.json() : null)).then((d) => { if (actif) setR(d); }).catch(() => {});
    return () => { actif = false; };
  }, [fournisseurId, version]);
  if (!r || (!r.arrets.length && !r.sansCoordonnees.length)) return null;
  const points: PointCarte[] = [
    ...(r.depart ? [{ id: "pos", ...r.depart, type: "livreur" as const, libelle: t("Votre position") }] : []),
    ...r.arrets.map((a: any) => ({ id: a.id, lat: a.lat, lng: a.lng, type: a.type === "enlevement" ? "depart" as const : "arrivee" as const, libelle: `${a.ordre}. ${a.reference}` })),
  ];
  const trace: [number, number][] = [...(r.depart ? [[r.depart.lat, r.depart.lng] as [number, number]] : []), ...r.arrets.map((a: any) => [a.lat, a.lng] as [number, number])];
  const etapes = r.arrets.slice(0, 10), fin = etapes.at(-1);
  const lien = fin ? `https://www.google.com/maps/dir/?api=1&destination=${fin.lat},${fin.lng}${etapes.length > 1 ? `&waypoints=${etapes.slice(0, -1).map((a: any) => `${a.lat},${a.lng}`).join("|")}` : ""}` : null;
  return <section className="axl-carte">
    <h2><Route size={18} /> {t("Tournée conseillée")}</h2>
    {r.arrets.length > 0 && <p className="axl-doux">{r.arrets.length} {t("arrêts")} · {(r.distanceM / 1000).toFixed(1)} km {r.routier ? `${t("par la route")}${r.dureeS != null ? ` · ${Math.round(r.dureeS / 60)} min` : ""}` : t("à vol d'oiseau")}</p>}
    {points.length > 0 && <CarteLogistique points={points} trace={r.route ? [] : trace} route={r.route} hauteur={240} />}
    <ol className="axl-liste">{r.arrets.map((a: any) => <li key={a.id}><span>{a.ordre}. {t(a.type === "enlevement" ? "Enlever" : "Livrer")} {a.reference}{a.quartier || a.ville ? ` · ${a.quartier ?? a.ville}` : ""}</span>{a.express && <span className="axl-etat" data-tone="warning">{t("Express")}</span>}</li>)}</ol>
    {r.ignorees.length > 0 && <p className="axl-alerte">{t("Hors tournée (capacité ou délai)")} : {r.ignorees.join(", ")}</p>}
    {r.sansCoordonnees.length > 0 && <p className="axl-alerte">{t("Adresse sans position GPS")} : {r.sansCoordonnees.join(", ")}</p>}
    {lien && <div className="axl-actions"><a className="axl-btn" href={lien} target="_blank" rel="noopener noreferrer">{t("Ouvrir l'itinéraire")}</a></div>}
  </section>;
}
