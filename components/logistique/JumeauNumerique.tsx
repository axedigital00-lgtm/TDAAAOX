"use client";
// Jumeau numérique : carte des livreurs en 2D, charge des zones en 3D.
import { useCallback, useEffect, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Badge, Carte, EtatVide } from "@/components/command-center/ui";
import type { ZoneJumeau } from "@/lib/logistique/jumeau";
import { STATUTS_COURSE } from "@/lib/logistique/libelles";
import { CarteLogistique } from "./CarteLogistique";

const COULEUR: Record<ZoneJumeau["niveau"], string> = { calme: "#2fbf71", soutenu: "#EDA900", sature: "#e5534b", sans_capacite: "#9085e9" };
const NIVEAU: Record<ZoneJumeau["niveau"], string> = { calme: "Calme", soutenu: "Soutenu", sature: "Saturé", sans_capacite: "Sans capacité" };
const TON_ANOMALIE: Record<string, "warn" | "bad" | "info"> = { INFO: "info", WARNING: "warn", HIGH_PRIORITY: "bad", CRITICAL: "bad" };
const TON: Record<string, "good" | "bad" | "warn" | "info" | "neutre"> = { success: "good", critical: "bad", warning: "warn", info: "info", neutral: "neutre" };

const nuance = (hex: string, f: number) => `#${[1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * f).toString(16).padStart(2, "0")).join("")}`;

function Zones3D({ zones }: { zones: ZoneJumeau[] }) {
  const t = useT();
  const liste = zones.slice(0, 16), cote = Math.ceil(Math.sqrt(liste.length)), max = Math.max(1, ...liste.map((z) => Math.max(z.actives, z.capacite)));
  const L = 54, H = 27, largeur = Math.max(420, (cote * 2 + 1) * L), hauteur = (cote * 2 + 1) * H + 170, ox = largeur / 2, oy = 158;
  const cellules = liste.map((z, i) => ({ z, x: i % cote, y: Math.floor(i / cote) })).sort((a, b) => a.x + a.y - (b.x + b.y));
  return <svg viewBox={`0 0 ${largeur} ${hauteur}`} role="img" aria-label={t("Charge des zones en trois dimensions")} style={{ width: "100%", height: "auto", maxHeight: 440 }}>
    {cellules.map(({ z, x, y }) => {
      const cx = ox + (x - y) * L, cy = oy + (x + y) * H, h = 10 + (z.actives / max) * 130, c = COULEUR[z.niveau], w = L * .72, d = H * .72;
      return <g key={z.ville}>
        <title>{`${z.ville} · ${z.actives} ${t("courses")} · ${t("capacité")} ${z.capacite} · ${t(NIVEAU[z.niveau])}`}</title>
        <path d={`M${cx} ${cy - d}L${cx + w} ${cy}L${cx} ${cy + d}L${cx - w} ${cy}Z`} fill="currentColor" opacity=".08" />
        <path d={`M${cx - w} ${cy}L${cx} ${cy + d}V${cy + d - h}L${cx - w} ${cy - h}Z`} fill={nuance(c, .62)} />
        <path d={`M${cx + w} ${cy}L${cx} ${cy + d}V${cy + d - h}L${cx + w} ${cy - h}Z`} fill={nuance(c, .8)} />
        <path d={`M${cx} ${cy - d - h}L${cx + w} ${cy - h}L${cx} ${cy + d - h}L${cx - w} ${cy - h}Z`} fill={c} />
        <text x={cx} y={cy - h - d - 7} textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">{z.actives}</text>
        <text x={cx} y={cy + d + 15} textAnchor="middle" fontSize="11" fill="currentColor" opacity=".7">{z.ville.slice(0, 13)}</text>
      </g>;
    })}
  </svg>;
}

export function JumeauNumerique() {
  const t = useT();
  const [d, setD] = useState<any>(null);
  const [erreur, setErreur] = useState(false);
  const [vue, setVue] = useState<"2d" | "3d">("2d");
  const charger = useCallback(async () => {
    const r = await fetch("/api/admin/logistique/jumeau").catch(() => null);
    if (!r?.ok) return setErreur(true);
    setD(await r.json()); setErreur(false);
  }, []);
  useEffect(() => { charger(); const i = setInterval(() => { if (!document.hidden) charger(); }, 15_000); return () => clearInterval(i); }, [charger]);
  if (!d) return <Carte><p className="cc-faint text-[13px]">{t(erreur ? "Jumeau indisponible pour le moment." : "Chargement…")}</p></Carte>;
  const localises = d.vehicules.filter((v: any) => v.lat != null), alertes = d.vehicules.filter((v: any) => v.anomalies.length);
  const points = localises.map((v: any) => ({ id: v.courseId, lat: v.lat, lng: v.lng, type: "livreur" as const, libelle: `${v.reference}${v.fournisseur ? ` · ${v.fournisseur}` : ""}`, perime: v.signal === "perime" }));
  return <div className="space-y-3">
    {erreur && <p className="cc-faint text-[12.5px]">{t("Dernière actualisation échouée : données du")} {new Date(d.genereLe).toLocaleTimeString(t.loc)}</p>}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[["Courses actives", d.resume.actives], ["Localisées", d.resume.localisees], ["Signal perdu", d.resume.signalPerdu], ["Anomalies", d.resume.anomalies]].map(([l, v]) => <div key={l} className="cc-card px-4 py-3"><p className="cc-faint text-[12px]">{t(l)}</p><p className="text-[22px] font-semibold cc-num">{v}</p></div>)}</div>
    <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
      <Carte titre={t("Jumeau du réseau")} sousTitre={t("Positions et courses réelles")} actions={<div className="flex gap-1" role="tablist">{(["2d", "3d"] as const).map((x) => <button key={x} type="button" role="tab" aria-selected={vue === x} className={`cc-btn cc-btn-sm ${vue === x ? "cc-btn-primary" : ""}`} onClick={() => setVue(x)}>{x.toUpperCase()}</button>)}</div>}>
        {vue === "2d" ? (points.length ? <CarteLogistique points={points} hauteur={420} /> : <EtatVide titre={t("Aucun livreur localisé")} explication={t("Les positions apparaissent quand un livreur partage son GPS pendant une course.")} />)
          : d.zones.length ? <Zones3D zones={d.zones} /> : <EtatVide titre={t("Aucune zone active")} explication={t("Les zones apparaissent avec les transporteurs et les courses.")} />}
      </Carte>
      <Carte titre={t("Tension des zones")} pad={false}>{!d.zones.length ? <div className="p-4"><p className="cc-faint text-[13px]">{t("Aucune zone.")}</p></div> : <ul>{d.zones.slice(0, 12).map((z: ZoneJumeau) => <li key={z.ville} className="flex items-center justify-between gap-2 px-4 py-2 border-t cc-sep text-[13px]"><span className="flex items-center gap-2 min-w-0"><i aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 3, background: COULEUR[z.niveau], flex: "none" }} /><span className="truncate">{z.ville}</span></span><span className="cc-faint cc-num whitespace-nowrap">{z.actives} / {z.capacite} · {t(NIVEAU[z.niveau])}</span></li>)}</ul>}</Carte>
    </div>
    <Carte titre={t("Courses à surveiller")} pad={false}>{!alertes.length ? <div className="p-4"><p className="cc-faint text-[13px]">{t("Aucune anomalie détectée.")}</p></div> : <ul>{alertes.map((v: any) => <li key={v.courseId} className="px-4 py-2.5 border-t cc-sep text-[13px]"><div className="flex flex-wrap items-center gap-2"><b>{v.reference}</b><Badge ton={TON[STATUTS_COURSE[v.statut]?.tone]}>{t(STATUTS_COURSE[v.statut]?.l ?? v.statut)}</Badge>{v.fournisseur && <span className="cc-faint">{v.fournisseur}</span>}</div>{v.anomalies.map((a: any) => <div key={a.type} className="flex items-center gap-2 mt-1"><Badge ton={TON_ANOMALIE[a.severite]}>{t(a.severite === "CRITICAL" ? "Critique" : a.severite === "HIGH_PRIORITY" ? "Prioritaire" : a.severite === "WARNING" ? "Attention" : "Info")}</Badge><span>{t(a.detail)}</span></div>)}</li>)}</ul>}</Carte>
  </div>;
}
