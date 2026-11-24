"use client";
// Coins IA : solde, studio premium (visuels, publicités) et historique.
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Banner, Card } from "@/components/dashboard/design-system/components/primitives";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { formatMontant } from "@/lib/utils";

const TYPES: Record<string, string> = { bienvenue: "Coins de bienvenue", mensuel: "Coins du forfait", achat: "Achat de coins", consommation: "Action IA", remboursement: "Remboursement", expiration: "Coins du mois expirés", ajustement: "Ajustement AXSO" };

export default function CoinsPage() {
  const t = useT();
  const [d, setD] = useState<any>(null);
  const [action, setAction] = useState("visuel");
  const [brief, setBrief] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<any>(null);
  const charger = useCallback(() => fetch("/api/coins").then((r) => (r.ok ? r.json() : null)).then(setD).catch(() => {}), []);
  useEffect(() => { charger(); }, [charger]);
  const lancer = async () => {
    setEnvoi(true); setResultat(null);
    try {
      const r = await fetch("/api/ia/premium", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, brief }) });
      const x = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(x.error ?? "Action impossible");
      setResultat(x); toast.success(t("C'est prêt"));
    } catch (e: any) { toast.error(t(e.message)); } finally { setEnvoi(false); charger(); }
  };
  if (!d) return <Page><PageHeader icon="sparkle" title={t("Coins IA")} /><Card><p className="axd-muted" style={{ margin: 0 }}>{t("Chargement…")}</p></Card></Page>;
  const choisie = d.actions[action];
  return <Page>
    <PageHeader icon="sparkle" title={t("Coins IA")} />
    <div className="axd-stack">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: "var(--space-300)" }}>
        {[["Solde", d.solde.total], ["Coins du forfait", d.solde.inclus], ["Coins achetés", d.solde.achetes]].map(([l, v]) => <Card key={l}><p className="axd-muted" style={{ margin: 0, fontSize: 12 }}>{t(l)}</p><p style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 650 }}>{v}</p></Card>)}
      </div>
      <Card title={t("Studio premium")}>
        {!d.actionsDisponibles && <Banner tone="info">{t("Les actions premium arrivent bientôt.")}</Banner>}
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{Object.entries(d.actions).map(([id, a]: [string, any]) => <Button key={id} variant={action === id ? "primary" : "default"} size="sm" onClick={() => setAction(id)}>{t(a.nom)} · {a.coins} {t(a.coins > 1 ? "coins" : "coin")}</Button>)}</div>
          <textarea className="axd-input" rows={4} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder={t(action === "publicite" ? "Ex : sac en cuir artisanal, clientèle de femmes actives à Douala, promotion de rentrée" : "Ex : sac en cuir marron posé sur une table en bois, lumière du matin")} style={{ height: "auto", paddingTop: 10, paddingBottom: 10 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Button variant="primary" loading={envoi} disabled={!d.actionsDisponibles || brief.trim().length < 8 || d.solde.total < choisie.coins} onClick={lancer}>{t("Générer pour {0} coin(s)", String(choisie.coins))}</Button>
            {d.solde.total < choisie.coins && <span className="axd-muted" style={{ fontSize: 13 }}>{t("Solde insuffisant")}</span>}
          </div>
          <p className="axd-muted" style={{ margin: 0, fontSize: 12.5 }}>{t("Si la génération échoue, tes coins te sont rendus automatiquement.")}</p>
          {resultat && <div style={{ display: "grid", gap: 10 }}>
            {resultat.texte && <pre style={{ whiteSpace: "pre-wrap", font: "inherit", fontSize: 14, margin: 0, padding: 12, borderRadius: 12, background: "var(--color-bg-surface-secondary, #f6f6f4)" }}>{resultat.texte}</pre>}
            {resultat.image && <img src={resultat.image} alt={t("Visuel généré")} style={{ width: "min(100%, 420px)", borderRadius: 14 }} />}
            {resultat.image && <div><Button href={resultat.image} external size="sm">{t("Ouvrir l'image")}</Button></div>}
          </div>}
        </div>
      </Card>
      <Card title={t("Acheter des coins")}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))", gap: 10 }}>{d.packs.map((p: any) => <div key={p.id} style={{ border: "1px solid var(--color-border, #e3e3e3)", borderRadius: 12, padding: 12 }}><b style={{ fontSize: 18 }}>{p.coins} {t("coins")}</b><p className="axd-muted" style={{ margin: "2px 0 8px", fontSize: 13 }}>{formatMontant(p.prix, "XAF")}</p><Button size="sm" disabled>{t("Bientôt")}</Button></div>)}</div>
        <p className="axd-muted" style={{ margin: "10px 0 0", fontSize: 12.5 }}>{t("Paiement Mobile Money bientôt disponible. Forfait Pro : {0} coins par mois. Illimité : {1} coins par mois. Les coins du forfait expirent à la fin du mois.", String(d.inclus.mensuels.palier1), String(d.inclus.mensuels.palier2))}</p>
      </Card>
      <Card title={t("Historique")} padding="none">{!d.historique.length ? <div style={{ padding: 16 }}><p className="axd-muted" style={{ margin: 0 }}>{t("Aucun mouvement.")}</p></div> : <table className="axd-ix"><tbody>{d.historique.map((e: any) => <tr key={e.id}><td>{t(TYPES[e.type] ?? e.type)}{e.action && d.actions[e.action] ? ` · ${t(d.actions[e.action].nom)}` : ""}{e.motif ? ` · ${e.motif}` : ""}</td><td><Badge tone={e.source === "achete" ? "info" : "neutral"}>{t(e.source === "achete" ? "Acheté" : "Forfait")}</Badge></td><td style={{ textAlign: "right", fontWeight: 600 }}>{e.montant > 0 ? `+${e.montant}` : e.montant}</td><td className="axd-muted" style={{ textAlign: "right", fontSize: 12.5 }}>{new Date(e.createdAt).toLocaleDateString(t.loc)}</td></tr>)}</tbody></table>}</Card>
    </div>
  </Page>;
}
