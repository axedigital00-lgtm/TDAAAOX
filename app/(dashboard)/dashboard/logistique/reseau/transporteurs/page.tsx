"use client";
// Transporteurs du réseau : performances réelles, certification AXSO, sans donnée privée.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/I18nProvider";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Card, EmptyState } from "@/components/dashboard/design-system/components/primitives";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { NIVEAUX, VEHICULES } from "@/lib/logistique/libelles";

export default function TransporteursReseauPage() {
  const t = useT();
  const [ville, setVille] = useState("");
  const [liste, setListe] = useState<any[] | null>(null);
  useEffect(() => {
    const id = setTimeout(() => {
      fetch(`/api/logistique/annuaire${ville.trim() ? `?ville=${encodeURIComponent(ville.trim())}` : ""}`).then((r) => r.json()).then((d) => setListe(d.transporteurs ?? d.fournisseurs ?? [])).catch(() => setListe([]));
    }, 250);
    return () => clearTimeout(id);
  }, [ville]);
  return <Page>
    <PageHeader icon="truck" title={t("Transporteurs du réseau")} backHref="/dashboard/logistique/reseau" />
    <div className="axd-stack">
      <Card><input className="axd-input" value={ville} onChange={(e) => setVille(e.target.value)} placeholder={t("Filtrer par ville")} aria-label={t("Ville")} /></Card>
      {liste === null ? <Card><p className="axd-muted" style={{ margin: 0 }}>{t("Chargement…")}</p></Card> : !liste.length ? <Card><EmptyState heading={t("Aucun transporteur")}>{t("Aucun transporteur ne couvre encore cette zone.")}</EmptyState></Card> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: "var(--space-300)" }}>
          {liste.map((f) => <Link key={f.id} href={`/dashboard/logistique/reseau/transporteurs/${f.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}><b>{f.nom}</b><p className="axd-muted" style={{ margin: "2px 0 0", fontSize: 13 }}>{t(f.type === "societe" ? "Société de livraison" : "Livreur indépendant")}</p></div>
                <b style={{ fontSize: 20 }}>{f.probation ? "—" : f.global}</b>
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", margin: "10px 0" }}>
                {f.certifie && <Badge tone="success">{t("Certifié AXSO")}</Badge>}
                {f.probation ? <Badge>{t("Nouveau")}</Badge> : f.niveau && <Badge tone="info">{NIVEAUX[f.niveau]}</Badge>}
                {f.verifie && <Badge>{t("Documents vérifiés")}</Badge>}
              </div>
              <p className="axd-muted" style={{ margin: 0, fontSize: 13 }}>{f.zones.slice(0, 3).join(", ")}{f.vehicules.length ? ` · ${f.vehicules.map((v: string) => t(VEHICULES[v] ?? v)).join(", ")}` : ""}</p>
            </Card>
          </Link>)}
        </div>
      )}
    </div>
  </Page>;
}
