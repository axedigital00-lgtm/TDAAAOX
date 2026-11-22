"use client";
// Commandes brouillons et devis : liste, et demandes reçues du portail entreprise.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/I18nProvider";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Card, EmptyState } from "@/components/dashboard/design-system/components/primitives";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { formatMontant } from "@/lib/utils";

const STATUTS: Record<string, { l: string; tone?: "success" | "attention" | "critical" | "info" }> = {
  brouillon: { l: "Brouillon" }, envoye: { l: "Envoyé", tone: "info" }, soumis: { l: "À valider", tone: "attention" },
  accepte: { l: "Accepté", tone: "success" }, refuse: { l: "Refusé", tone: "critical" }, annule: { l: "Annulé" },
};

type Ligne = { id: string; numero: string; statut: string; clientNom: string; total: number; devise: string; createdAt: string };

export default function DevisPage() {
  const t = useT();
  const [devis, setDevis] = useState<Ligne[] | null>(null);
  useEffect(() => { fetch("/api/devis").then((r) => r.json()).then((d) => setDevis(d.devis ?? [])).catch(() => setDevis([])); }, []);

  return (
    <Page>
      <PageHeader icon="doc" title={t("Brouillons et devis")} backHref="/dashboard/commandes" primaryAction={{ content: t("Créer un devis"), href: "/dashboard/commandes/devis/nouveau" }} />
      {devis === null ? <Card><p className="axd-muted" style={{ margin: 0 }}>{t("Chargement…")}</p></Card> : devis.length === 0 ? (
        <Card><EmptyState heading={t("Aucun devis pour l'instant")}>{t("Préparez une commande pour un client, envoyez-lui le lien, et elle devient une vraie commande dès qu'il l'accepte.")}</EmptyState></Card>
      ) : (
        <Card padding="none">
          <div style={{ overflowX: "auto" }}>
            <table className="axd-ix">
              <thead><tr><th>{t("Numéro")}</th><th>{t("Client")}</th><th>{t("Statut")}</th><th>{t("Date")}</th><th style={{ textAlign: "right" }}>{t("Total")}</th></tr></thead>
              <tbody>
                {devis.map((d) => (
                  <tr key={d.id}>
                    <td className="axd-ix-primary"><Link href={`/dashboard/commandes/devis/${d.id}`}>{d.numero}</Link></td>
                    <td>{d.clientNom}</td>
                    <td><Badge tone={STATUTS[d.statut]?.tone}>{t(STATUTS[d.statut]?.l ?? d.statut)}</Badge></td>
                    <td>{new Date(d.createdAt).toLocaleDateString(t.loc)}</td>
                    <td style={{ textAlign: "right" }}>{formatMontant(d.total, d.devise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Page>
  );
}
