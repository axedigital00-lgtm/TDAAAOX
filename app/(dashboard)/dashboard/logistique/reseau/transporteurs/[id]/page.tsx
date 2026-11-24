"use client";
// Fiche d'un transporteur : crédibilité calculée sur ses livraisons réelles.
import { use, useEffect, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Banner, Card } from "@/components/dashboard/design-system/components/primitives";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { BADGES, NIVEAUX, VEHICULES } from "@/lib/logistique/libelles";

const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)} %`);

export default function FicheTransporteurPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const [f, setF] = useState<any>(undefined);
  useEffect(() => { fetch(`/api/logistique/annuaire/${encodeURIComponent(id)}`).then((r) => (r.ok ? r.json() : null)).then((d) => setF(d?.transporteur ?? null)).catch(() => setF(null)); }, [id]);
  if (f === undefined) return <Page><PageHeader icon="truck" title={t("Transporteur")} backHref="/dashboard/logistique/reseau/transporteurs" /><Card><p className="axd-muted" style={{ margin: 0 }}>{t("Chargement…")}</p></Card></Page>;
  if (!f) return <Page><PageHeader icon="truck" title={t("Transporteur")} backHref="/dashboard/logistique/reseau/transporteurs" /><Banner tone="warning">{t("Ce transporteur n'est pas disponible.")}</Banner></Page>;
  const indicateurs: [string, string][] = [
    ["Score AXSO", f.probation ? "—" : `${f.global}/100`], ["Livraisons", String(f.volume)], ["Réussite", pct(f.tauxReussite)], ["À l'heure", pct(f.tauxATemps)],
    ["Fiabilité", f.probation ? "—" : `${f.fiabilite}/100`], ["Avis clients", f.avis.nombre ? `${f.avis.moyenne.toFixed(1)}/5 (${f.avis.nombre})` : "—"],
  ];
  return <Page>
    <PageHeader icon="truck" title={f.nom} backHref="/dashboard/logistique/reseau/transporteurs" />
    <div className="axd-stack">
      <Card>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {f.certifie && <Badge tone="success">{t("Certifié AXSO")}</Badge>}
          {f.probation ? <Badge>{t("Nouveau sur le réseau")}</Badge> : f.niveau && <Badge tone="info">{NIVEAUX[f.niveau]}</Badge>}
          {f.verifie && <Badge>{t("Documents vérifiés")}</Badge>}
          <Badge tone={f.disponible ? "success" : "neutral"}>{t(f.disponible ? "Disponible" : "Indisponible")}</Badge>
        </div>
        <p className="axd-muted" style={{ margin: 0, fontSize: 14 }}>{t(f.type === "societe" ? "Société de livraison" : "Livreur indépendant")} · {f.zones.join(", ") || "—"} · {f.vehicules.map((v: string) => t(VEHICULES[v] ?? v)).join(", ")}</p>
        {f.description && <p style={{ margin: "10px 0 0", fontSize: 14 }}>{f.description}</p>}
        {f.probation && <p className="axd-muted" style={{ margin: "10px 0 0", fontSize: 13 }}>{t("Pas encore assez de livraisons pour un score fiable. Il s'affichera après ses premières courses.")}</p>}
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", gap: "var(--space-300)" }}>
        {indicateurs.map(([l, v]) => <Card key={l}><p className="axd-muted" style={{ margin: 0, fontSize: 12 }}>{t(l)}</p><p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 650 }}>{v}</p></Card>)}
      </div>
      {f.badges.length > 0 && <Card title={t("Distinctions")}><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{f.badges.map((b: string) => <Badge key={b}>{t(BADGES[b] ?? b)}</Badge>)}</div></Card>}
      <Card title={t("Derniers avis")}>{!f.avis.derniers.length ? <p className="axd-muted" style={{ margin: 0 }}>{t("Aucun avis pour l'instant.")}</p> : <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>{f.avis.derniers.map((a: any, i: number) => <li key={i} style={{ fontSize: 14 }}><b>{"★".repeat(a.note)}</b>{a.commentaire ? ` ${a.commentaire}` : ""} <span className="axd-muted">· {new Date(a.le).toLocaleDateString(t.loc)}</span></li>)}</ul>}</Card>
      <p className="axd-muted" style={{ margin: 0, fontSize: 12.5 }}>{t("Le score est calculé par AXSO à partir des livraisons réelles : réussite, ponctualité, incidents et avis. Il ne peut pas être acheté.")}</p>
    </div>
  </Page>;
}
