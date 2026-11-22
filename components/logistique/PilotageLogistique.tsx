"use client";
// Pilotage admin : relations de confiance, rentabilité par ville et gouvernance des modèles.
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Badge, Carte, EtatVide } from "@/components/command-center/ui";
import { formatMontant } from "@/lib/utils";

export function PilotageLogistique({ peutAgir }: { peutAgir: boolean }) {
  const t = useT();
  const [d, setD] = useState<any>(null);
  const charger = useCallback(() => fetch("/api/admin/logistique/pilotage").then((r) => (r.ok ? r.json() : null)).then(setD).catch(() => {}), []);
  useEffect(() => { charger(); }, [charger]);
  const etat = async (id: string, e: string) => {
    const r = await fetch("/api/admin/logistique", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "modele", id, etat: e }) });
    const x = await r.json().catch(() => ({}));
    if (!r.ok) return void toast.error(t(x.error ?? "Action impossible"));
    toast.success(t("Modèle mis à jour")); charger();
  };
  if (!d) return <Carte><p className="cc-faint text-[13px]">{t("Chargement…")}</p></Carte>;
  const max = Math.max(1, ...d.graphe.liens.map((l: any) => l.livrees + l.echecs));
  return <div className="grid gap-3 xl:grid-cols-2">
    <Carte titre={t("Graphe de confiance")} sousTitre={t("Relations réelles entre boutiques et transporteurs")} pad={false}>
      {!d.graphe.liens.length ? <div className="p-4"><EtatVide titre={t("Aucune relation")} explication={t("Le graphe se construit avec les livraisons terminées.")} /></div> : <ul>{d.graphe.liens.slice(0, 14).map((l: any) => <li key={`${l.marchand}|${l.fournisseur}`} className="px-4 py-2 border-t cc-sep text-[13px]"><div className="flex justify-between gap-2"><span className="truncate">{l.marchand} → <b>{l.fournisseur}</b></span><span className="cc-num whitespace-nowrap">{l.reussite} % · {l.livrees + l.echecs}</span></div><div aria-hidden="true" style={{ height: 4, borderRadius: 2, marginTop: 5, width: `${((l.livrees + l.echecs) / max) * 100}%`, background: l.reussite >= 90 ? "#2fbf71" : l.reussite >= 70 ? "#EDA900" : "#e5534b" }} /></li>)}</ul>}
      {d.graphe.dependances.length > 0 && <div className="p-4 border-t cc-sep text-[13px]"><b>{t("Dépendances à surveiller")}</b>{d.graphe.dependances.map((x: any) => <p key={x.marchand} className="cc-muted mt-1">{t("{0} confie {1} % de ses livraisons à {2}.", x.marchand, String(x.part), x.fournisseur)}</p>)}</div>}
    </Carte>
    <Carte titre={t("Rentabilité par ville")} sousTitre={t("Commission moins crédits offerts")} pad={false}>
      {!d.economie.length ? <div className="p-4"><EtatVide titre={t("Pas encore de données")} explication={t("Elles apparaissent avec les livraisons terminées.")} /></div> : <div className="overflow-x-auto"><table className="w-full text-[13px]"><thead><tr className="cc-faint text-left"><th className="px-4 py-2 font-medium">{t("Ville")}</th><th className="font-medium">{t("Courses")}</th><th className="font-medium">{t("Prix moyen")}</th><th className="px-4 font-medium text-right">{t("Contribution")}</th></tr></thead><tbody>{d.economie.map((v: any) => <tr key={v.ville} className="border-t cc-sep"><td className="px-4 py-2">{v.ville}</td><td className="cc-num">{v.courses}</td><td className="cc-num">{formatMontant(v.prixMoyen, "XAF")}</td><td className="px-4 text-right cc-num">{v.deficitaire ? <Badge ton="bad">{formatMontant(v.contribution, "XAF")}</Badge> : formatMontant(v.contribution, "XAF")}</td></tr>)}</tbody></table></div>}
    </Carte>
    <Carte titre={t("Gouvernance des modèles")} sousTitre={t("Chaque évaluation est versionnée ; un modèle retiré n'est plus publié")} className="xl:col-span-2" pad={false}>
      {!d.modeles.length ? <div className="p-4"><p className="cc-faint text-[13px]">{t("La première évaluation sera créée par la prochaine tâche planifiée.")}</p></div> : <ul>{d.modeles.map((m: any) => <li key={m.id} className="flex flex-wrap items-center gap-2 px-4 py-2 border-t cc-sep text-[13px]"><b>{m.nom} v{m.version}</b><Badge ton={m.etat === "actif" ? "good" : m.etat === "retire" ? "bad" : "neutre"}>{t(m.etat === "actif" ? "Actif" : m.etat === "retire" ? "Retiré" : "Observation")}</Badge><span className="cc-faint flex-1 min-w-[160px]">{m.metriques.joursObserves ?? 0} {t("jours")}{m.metriques.erreurModele != null ? ` · ${t("erreur")} ${m.metriques.erreurModele} / ${t("référence")} ${m.metriques.erreurNaive}` : ""}</span>{peutAgir && (m.etat === "retire" ? <button type="button" className="cc-btn cc-btn-sm" onClick={() => etat(m.id, "actif")}>{t("Réactiver")}</button> : <button type="button" className="cc-btn cc-btn-sm" onClick={() => etat(m.id, "retire")}>{t("Retirer")}</button>)}</li>)}</ul>}
    </Carte>
  </div>;
}
