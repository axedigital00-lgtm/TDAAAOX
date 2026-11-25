"use client";

import { useEffect, useState } from "react";
import { FileText, Download, Plus, Search } from "lucide-react";
import { ModuleTutorial } from "@/components/dashboard/ModuleTutorial";
import { useT } from "@/components/I18nProvider";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { Icon } from "@/components/dashboard/design-system/icons/Icon";

const FACTURES_TUTORIAL_STEPS = [
  { Icon: Plus,     titre: "Génère une facture",  description: "Saisis l'ID d'une commande et clique sur Générer pour créer automatiquement la facture HT/TVA/TTC." },
  { Icon: Search,   titre: "Retrouve une facture", description: "Recherche par nom de client ou numéro de facture pour la retrouver en un instant." },
  { Icon: Download, titre: "Télécharge le PDF",    description: "Chaque facture se télécharge en un clic, prête à être envoyée à ton client." },
  { Icon: FileText, titre: "Suis le statut",       description: "Repère en un coup d'œil les factures émises, payées ou annulées grâce aux badges de statut." },
];

interface Facture {
  id: string;
  commandeId: string;
  numero: string;
  clientNom: string;
  clientEmail: string;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  tauxTVA: number;
  devise: string;
  statut: string;
  emiseAt: string;
}

// `color` : badge du document HTML téléchargé (hors admin) ; `tone` : badge de l'admin.
const STATUT_CONFIG: Record<string, { label: string; color: string; tone: "attention" | "success" | "critical" }> = {
  emise: { label: "Émise", color: "#8a6116", tone: "attention" },
  payee: { label: "Payée", color: "#0c5132", tone: "success" },
  annulee: { label: "Annulée", color: "#8e1f0b", tone: "critical" },
};
const devise = (d: string) => (d === "XAF" ? "FCFA" : d);

function FacturePDF({ facture }: { facture: Facture }) {
  const t = useT();
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;color:#111;font-size:13px}
  h1{font-size:24px;margin-bottom:4px}
  .header{display:flex;justify-content:space-between;margin-bottom:32px}
  .label{color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
  table{width:100%;border-collapse:collapse;margin:24px 0}
  th{background:#F5F5F5;padding:8px 12px;text-align:left;font-size:11px}
  td{padding:8px 12px;border-bottom:1px solid #F0F0F0}
  .total{text-align:right;margin-top:16px}
  .total p{margin:4px 0}
  .total .ttc{font-size:18px;font-weight:bold}
  .badge{display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600;color:white;background:${STATUT_CONFIG[facture.statut]?.color ?? "#888"}}
</style>
</head>
<body>
<div class="header">
  <div><h1>FACTURE</h1><p>${facture.numero}</p><p class="label">${new Date(facture.emiseAt).toLocaleDateString(t.loc)}</p></div>
  <div class="total"><span class="badge">${STATUT_CONFIG[facture.statut]?.label ?? facture.statut}</span></div>
</div>
<p><strong>{t("Client :")}</strong> ${facture.clientNom} (${facture.clientEmail})</p>
<div class="total">
  ${facture.tauxTVA > 0 ? `<p>Montant HT : ${facture.montantHT.toLocaleString("fr")} ${facture.devise}</p><p>TVA (${(facture.tauxTVA * 100).toFixed(0)}%) : ${facture.montantTVA.toLocaleString("fr")} ${facture.devise}</p>` : ""}
  <p class="ttc">Total : ${facture.montantTTC.toLocaleString("fr")} ${facture.devise}</p>
</div>
</body>
</html>`;

  function download() {
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${facture.numero}.html`;
    a.click();
  }

  return (
    <Button size="sm" variant="plain" onClick={download}>{t("Télécharger")}</Button>
  );
}

export function FacturesPanel() {
  const t = useT();
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [genId, setGenId] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch("/api/factures")
      .then((r) => r.json())
      .then((d) => setFactures(d.factures ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function genFacture() {
    if (!genId.trim()) return;
    setGenerating(true);
    const res = await fetch("/api/factures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commandeId: genId.trim() }),
    });
    const data = await res.json();
    if (data.facture) {
      setFactures((prev) => {
        const exists = prev.find((f) => f.id === data.facture.id);
        return exists ? prev.map((f) => f.id === data.facture.id ? data.facture : f) : [data.facture, ...prev];
      });
      setGenId("");
    }
    setGenerating(false);
  }

  const filtered = factures.filter((f) =>
    !q || f.clientNom.toLowerCase().includes(q.toLowerCase()) || f.numero.toLowerCase().includes(q.toLowerCase())
  );

  const totalTTC = factures.filter((f) => f.statut === "payee").reduce((s, f) => s + f.montantTTC, 0);

  if (loading) return <div className="axd-card"><p className="axd-fichiers__etat">{t("Chargement…")}</p></div>;

  return (
    <div className="axd-stack">
      <ModuleTutorial moduleKey="logistique-factures" titre={t("Factures")} sousTitre={t("Suivi de facturation")} steps={FACTURES_TUTORIAL_STEPS} />

      <div className="axd-grid axd-g3">
        {[
          { l: "Factures", v: factures.length.toLocaleString(t.loc) },
          { l: "Factures payées", v: factures.filter((f) => f.statut === "payee").length.toLocaleString(t.loc) },
          { l: "Total encaissé", v: `${totalTTC.toLocaleString(t.loc)} ${devise(factures[0]?.devise ?? "XAF")}` },
        ].map((k) => (
          <div key={k.l} className="axd-card axd-card--pad">
            <div className="axd-kpi__t">{t(k.l)}</div>
            <div className="axd-kpi__v" style={{ marginBottom: 0 }}>{k.v}</div>
          </div>
        ))}
      </div>

      <div className="axd-card" style={{ overflow: "hidden" }}>
        <div className="axd-card__head" style={{ padding: "var(--space-300) var(--space-400)", gap: 8, flexWrap: "wrap" }}>
          <h2 className="axd-card__title">{t("Factures")}</h2>
          <form style={{ display: "flex", gap: 8 }} onSubmit={(e) => { e.preventDefault(); genFacture(); }}>
            <input className="axd-input" style={{ width: 200 }} placeholder={t("ID de la commande")} aria-label={t("ID de la commande")} value={genId} onChange={(e) => setGenId(e.target.value)} />
            <Button size="sm" type="submit" loading={generating} disabled={!genId.trim()}>{t("Générer la facture")}</Button>
          </form>
        </div>
        <div className="axd-ix-bar">
          <label className="axd-ix-search">
            <Icon name="search" />
            <input type="search" placeholder={t("Rechercher par client ou numéro")} aria-label={t("Rechercher par client ou numéro")} value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>
        {filtered.length === 0 ? (
          <div className="axd-empty">
            <h3>{q ? t("Aucune facture ne correspond") : t("Aucune facture pour l’instant")}</h3>
            <p>{t("Générez une facture à partir de l’ID d’une commande : montants HT, TVA et TTC sont calculés automatiquement.")}</p>
          </div>
        ) : (
          <div className="axd-ix-wrap">
            <table className="axd-ix">
              <thead><tr><th>{t("Facture")}</th><th>{t("Client")}</th><th>{t("Statut")}</th><th className="axd-ix-num">{t("Total TTC")}</th><th className="axd-ix-hide-m">{t("Date")}</th><th /></tr></thead>
              <tbody>
                {filtered.map((f) => {
                  const sc = STATUT_CONFIG[f.statut] ?? { label: f.statut, color: "#616161", tone: "attention" as const };
                  return (
                    <tr key={f.id}>
                      <td className="axd-ix-primary">{f.numero}</td>
                      <td>{t(f.clientNom)}<div className="axd-muted" style={{ fontSize: 12 }}>{f.clientEmail}</div></td>
                      <td><Badge tone={sc.tone}>{t(sc.label)}</Badge></td>
                      <td className="axd-ix-num">{f.montantTTC.toLocaleString(t.loc)} {devise(f.devise)}</td>
                      <td className="axd-ix-hide-m">{new Date(f.emiseAt).toLocaleDateString(t.loc, { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td style={{ textAlign: "right" }}><FacturePDF facture={f} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
