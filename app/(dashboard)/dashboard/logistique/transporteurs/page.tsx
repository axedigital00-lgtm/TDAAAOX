"use client";
// Partenaires de livraison : uniquement les agences du réseau AXSO, vérifiées et validées par AXSO.
// Les certifiées sont présentées en premier. Les anciens réglages de transporteurs génériques restent en base.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/I18nProvider";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Card, EmptyState } from "@/components/dashboard/design-system/components/primitives";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { NIVEAUX, VEHICULES } from "@/lib/logistique/libelles";

export default function TransporteursPage() {
  const tr = useT();
  const [liste, setListe] = useState<any[] | null>(null);
  const [ville, setVille] = useState("");
  useEffect(() => {
    fetch("/api/logistique/annuaire").then((r) => r.json()).then((d) => setListe((d.fournisseurs ?? []).filter((f: any) => f.type === "societe" && f.verifie))).catch(() => setListe([]));
  }, []);
  const agences = useMemo(() => {
    const v = ville.trim().toLowerCase();
    return (liste ?? []).filter((f) => !v || f.zones.some((z: string) => z.toLowerCase().includes(v))).sort((a, b) => Number(b.certifie) - Number(a.certifie));
  }, [liste, ville]);

  return (
    <Page width="narrow">
      <PageHeader icon="truck" backHref="/dashboard/logistique" title={tr("Partenaires de livraison")}
        primaryAction={{ content: tr("Demander une livraison"), href: "/dashboard/logistique/reseau" }} />
      <div className="axd-stack">
        <Card>
          <p style={{ margin: "0 0 10px", fontSize: 14 }}>{tr("Seules les agences de livraison vérifiées par AXSO apparaissent ici. Celles marquées « Certifiée AXSO » ont été sélectionnées par notre équipe pour leur fiabilité.")}</p>
          <input className="axd-input" value={ville} onChange={(e) => setVille(e.target.value)} placeholder={tr("Filtrer par ville")} aria-label={tr("Ville")} />
        </Card>
        {liste === null ? <Card><p className="axd-muted" style={{ margin: 0 }}>{tr("Chargement…")}</p></Card>
          : !agences.length ? <Card><EmptyState heading={tr("Aucune agence validée pour l'instant")}>{tr("Les agences de livraison vérifiées par AXSO apparaîtront ici. Vous pouvez déjà demander une livraison : AXSO propose les livreurs disponibles de votre zone.")}</EmptyState></Card>
          : <div className="axd-card" style={{ overflow: "hidden" }}>{agences.map((f) => (
            <div key={f.id} className="axd-livreur">
              <div className="axd-livreur__ligne">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <b style={{ color: "var(--color-text-strong)" }}>{f.nom}</b>
                    {f.certifie && <Badge tone="success">{tr("Certifiée AXSO")}</Badge>}
                    {!f.probation && f.niveau && <Badge tone="info">{NIVEAUX[f.niveau]}</Badge>}
                    {f.probation && <Badge>{tr("Nouvelle")}</Badge>}
                    <Badge tone={f.disponible ? "success" : "neutral"}>{tr(f.disponible ? "Disponible" : "Indisponible")}</Badge>
                  </div>
                  <div className="axd-muted" style={{ fontSize: 12 }}>
                    {f.zones.slice(0, 4).join(", ")}{f.vehicules.length ? ` · ${f.vehicules.map((v: string) => tr(VEHICULES[v] ?? v)).join(", ")}` : ""}{!f.probation ? ` · ${tr("Score")} ${f.global}/100` : ""}
                  </div>
                </div>
                <Link href={`/dashboard/logistique/reseau/transporteurs/${f.id}`}><Button size="sm">{tr("Voir la fiche")}</Button></Link>
              </div>
            </div>
          ))}</div>}
      </div>
    </Page>
  );
}
