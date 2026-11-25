"use client";
// Suivi des gains des coins IA : revenus, coûts réels, marge, budget et consommation.
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Badge, Carte, EtatVide, GrilleKpi, Note, Progression } from "@/components/command-center/ui";
import { Barres, Courbes } from "@/components/command-center/graphiques";
import { formatMontant } from "@/lib/utils";

const NOMS: Record<string, string> = { visuel: "Visuel premium", visuel_hd: "Visuel premium HD", publicite: "Publicité complète" };
const f = (v: number | null | undefined) => (v == null ? "—" : formatMontant(Math.round(v), "XAF"));

export function GainsCoins({ peutModifier }: { peutModifier: boolean }) {
  const t = useT();
  const [jours, setJours] = useState(30);
  const [d, setD] = useState<any>(null);
  const [r, setR] = useState<any>(null);
  const [aj, setAj] = useState({ tenantId: "", montant: "", motif: "" });
  const charger = useCallback(async () => {
    const x = await fetch(`/api/admin/coins?jours=${jours}`).then((y) => (y.ok ? y.json() : null)).catch(() => null);
    setD(x); if (x) setR((p: any) => p ?? { ...x.reglages, budgetMensuelUsd: x.reglages.budgetMensuelUsd ?? "" });
  }, [jours]);
  useEffect(() => { charger(); }, [charger]);
  const poster = async (b: object, ok: string) => {
    const x = await fetch("/api/admin/coins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
    const e = await x.json().catch(() => ({}));
    if (!x.ok) return void toast.error(t(e.error ?? "Action impossible"));
    toast.success(t(ok)); charger();
  };
  if (!d) return <Carte><p className="cc-faint text-[13px]">{t("Chargement…")}</p></Carte>;
  const k = d.kpis, b = d.budget;
  const kpis: [string, string, string?][] = [
    ["Revenus encaissés (packs)", f(k.revenuEncaisse), `${k.coinsAchetes} ${t("coins vendus")}`],
    ["Marge brute", f(k.margeBrute), t("coins achetés consommés − coût IA")],
    ["Coût IA réel", f(k.coutReel), `${k.coutUsd.toFixed(2)} $`],
    ["Valeur consommée", f(k.valeurConsommee), `${k.coinsAchetesConsommes + k.coinsInclusConsommes} ${t("coins")}`],
    ["Multiplicateur réel", k.multiplicateurReel == null ? "—" : `× ${k.multiplicateurReel.toFixed(1)}`, t("objectif × 4")],
    ["Coût par coin", f(k.coutParCoin), t("plafond 50 FCFA")],
  ];
  return <div className="space-y-4">
    <div className="flex gap-1">{[7, 30, 90].map((j) => <button key={j} type="button" className={`cc-btn cc-btn-sm ${jours === j ? "cc-btn-primary" : ""}`} onClick={() => setJours(j)}>{j} {t("jours")}</button>)}</div>
    {k.coinsAchetes === 0 && <Note>{t("La vente de packs ouvrira avec le paiement Mobile Money. En attendant, seuls les coins inclus sont consommés : ils représentent un coût d'acquisition, pas un revenu.")}</Note>}
    <GrilleKpi colonnes={6}>{kpis.map(([l, v, s]) => <div key={l} className="cc-card px-4 py-3 min-w-0"><p className="cc-faint text-[12px] truncate">{t(l)}</p><p className="text-[21px] font-semibold cc-num truncate">{v}</p>{s && <p className="cc-faint text-[11px] truncate">{s}</p>}</div>)}</GrilleKpi>
    <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
      <Carte titre={t("Valeur facturée et coût réel par jour")} sousTitre={t("En FCFA")}>
        {d.serie.some((p: any) => p.cout || p.valeur) ? <Courbes donnees={d.serie} series={[{ cle: "valeur", nom: t("Valeur en coins") }, { cle: "cout", nom: t("Coût IA réel") }]} format="xaf" /> : <EtatVide titre={t("Pas encore d'activité")} explication={t("Les courbes apparaissent avec les premières actions premium.")} />}
      </Carte>
      <Carte titre={t("Budget IA du mois")} sousTitre={b.plafond ? `${b.mois.toFixed(2)} $ / ${b.plafond} $` : t("Aucun plafond défini")}>
        <Progression valeur={b.pct} ton={b.pct != null && b.pct >= (d.reglages.alertePct ?? 80) ? "bad" : "good"} />
        <dl className="mt-3 space-y-1.5 text-[13px]">
          <div className="flex justify-between"><dt className="cc-muted">{t("Projection fin de mois")}</dt><dd className="cc-num font-semibold">{b.projection.toFixed(2)} $</dd></div>
          <div className="flex justify-between"><dt className="cc-muted">{t("Coins inclus en circulation")}</dt><dd className="cc-num">{d.circulation.inclus}</dd></div>
          <div className="flex justify-between"><dt className="cc-muted">{t("Coins achetés non utilisés")}</dt><dd className="cc-num">{d.circulation.achetes} · {f(d.circulation.passifFcfa)}</dd></div>
          <div className="flex justify-between"><dt className="cc-muted">{t("Générations échouées (remboursées)")}</dt><dd className="cc-num">{k.echecs}</dd></div>
        </dl>
      </Carte>
    </div>
    <div className="grid gap-3 xl:grid-cols-2">
      <Carte titre={t("Rentabilité par action")} pad={false}>{!d.parAction.length ? <div className="p-4"><EtatVide titre={t("Aucune action")} explication={t("Les actions premium s'affichent ici.")} /></div> : <>
        <div className="px-3 pt-3"><Barres donnees={d.parAction.map((a: any) => ({ x: t(NOMS[a.action] ?? a.action), valeur: a.valeur, cout: a.cout }))} series={[{ cle: "valeur", nom: t("Valeur") }, { cle: "cout", nom: t("Coût") }]} format="xaf" hauteur={200} /></div>
        <table className="w-full text-[13px]"><tbody>{d.parAction.map((a: any) => <tr key={a.action} className="border-t cc-sep"><td className="px-4 py-2">{t(NOMS[a.action] ?? a.action)}</td><td className="cc-num">{a.actions}</td><td className="cc-num">{f(a.cout)}</td><td className="px-4 text-right cc-num"><Badge ton={a.marge >= 0 ? "good" : "bad"}>{f(a.marge)}</Badge></td></tr>)}</tbody></table>
      </>}</Carte>
      <Carte titre={t("Boutiques les plus consommatrices")} pad={false}>{!d.topBoutiques.length ? <div className="p-4"><p className="cc-faint text-[13px]">{t("Aucune consommation sur la période.")}</p></div> : <ul>{d.topBoutiques.map((x: any) => <li key={x.id} className="flex justify-between gap-2 px-4 py-2 border-t cc-sep text-[13px]"><span className="truncate">{x.nom}</span><span className="cc-num whitespace-nowrap">{x.coins} {t("coins")} · {f(x.cout)}</span></li>)}</ul>}</Carte>
    </div>
    {peutModifier && r && <div className="grid gap-3 xl:grid-cols-2">
      <Carte titre={t("Contrôle des dépenses")}><div className="grid gap-2 text-[13px]">
        <label className="flex justify-between items-center gap-3">{t("Budget mensuel (dollars)")}<input type="number" min={0} className="cc-btn w-32" value={r.budgetMensuelUsd} onChange={(e) => setR({ ...r, budgetMensuelUsd: e.target.value })} placeholder={t("Aucun")} /></label>
        <label className="flex justify-between items-center gap-3">{t("Alerte à (%)")}<input type="number" min={10} max={100} className="cc-btn w-32" value={r.alertePct} onChange={(e) => setR({ ...r, alertePct: Number(e.target.value) })} /></label>
        <label className="flex justify-between items-center gap-3">{t("1 dollar en FCFA")}<input type="number" className="cc-btn w-32" value={r.tauxXaf} onChange={(e) => setR({ ...r, tauxXaf: Number(e.target.value) })} /></label>
        <label className="flex gap-2"><input type="checkbox" checked={r.plafondDur} onChange={(e) => setR({ ...r, plafondDur: e.target.checked })} />{t("Bloquer les actions quand le budget est atteint")}</label>
        <label className="flex gap-2"><input type="checkbox" checked={r.actionsActives} onChange={(e) => setR({ ...r, actionsActives: e.target.checked })} />{t("Actions IA premium actives")}</label>
        <div><button type="button" className="cc-btn cc-btn-primary" onClick={() => poster({ action: "reglages", budgetMensuelUsd: r.budgetMensuelUsd === "" ? null : Number(r.budgetMensuelUsd), alertePct: r.alertePct, plafondDur: r.plafondDur, tauxXaf: r.tauxXaf, actionsActives: r.actionsActives }, "Réglages enregistrés")}>{t("Enregistrer")}</button></div>
      </div></Carte>
      <Carte titre={t("Ajuster les coins d'une boutique")} sousTitre={t("Geste commercial ou correction, toujours motivé")}><div className="grid gap-2 text-[13px]">
        <label className="grid gap-1">{t("Identifiant de la boutique")}<input className="cc-btn" value={aj.tenantId} onChange={(e) => setAj({ ...aj, tenantId: e.target.value.trim() })} /></label>
        <label className="grid gap-1">{t("Coins (négatif pour retirer)")}<input type="number" className="cc-btn" value={aj.montant} onChange={(e) => setAj({ ...aj, montant: e.target.value })} /></label>
        <label className="grid gap-1">{t("Motif")}<input className="cc-btn" value={aj.motif} onChange={(e) => setAj({ ...aj, motif: e.target.value })} /></label>
        <div><button type="button" className="cc-btn cc-btn-primary" disabled={!aj.tenantId || !Number(aj.montant) || aj.motif.trim().length < 3} onClick={() => poster({ action: "ajuster", tenantId: aj.tenantId, montant: Number(aj.montant), motif: aj.motif }, "Coins ajustés")}>{t("Ajuster")}</button></div>
      </div></Carte>
    </div>}
  </div>;
}
