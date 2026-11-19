"use client";
// Liste des paniers abandonnés : vue « Incomplets » par défaut, recherche, export CSV de la page,
// relance WhatsApp (lien wa.me) d'un panier ou d'une sélection.
import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Badge, Button, EmptyState, IndexFilters, IndexTable, PageHeader, majRecherche, type Column, type Vue } from "@/components/ui/adm";
import { IllustrationCommandes } from "@/components/ui/illustrations";

export type LignePanier = {
  id: string; reference: string; date: string; dateIso: string; client: string; telephone: string; region: string;
  statut: { label: string; tone: "warning" | "info" | "success" }; total: string; totalBrut: number;
  commandeId: string | null; relancable: boolean; refus: boolean;
};
type Props = { lignes: LignePanier[]; vues: Vue[]; page: number; total: number; parPage: number; vide: boolean };

function Liste({ lignes, vues, page, total, parPage, vide }: Props) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [enCours, setEnCours] = useState<string | null>(null);
  const aller = (patch: Record<string, string | null>) => {
    const qs = majRecherche(params.toString(), patch);
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const relancer = async (r: LignePanier) => {
    setEnCours(r.id);
    const fenetre = window.open("", "_blank");
    try {
      const res = await fetch(`/api/commandes/paniers/${r.id}`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error);
      if (fenetre) fenetre.location.href = d.whatsappUrl;
      toast.success(t("Relance prête à envoyer sur WhatsApp"));
      router.refresh();
    } catch (e) {
      fenetre?.close();
      toast.error((e as Error).message || t("La relance a échoué. Réessayez."));
    } finally {
      setEnCours(null);
    }
  };

  // Export des lignes affichées (CSV, ouvert par Excel) : pas d'aller-retour serveur.
  const exporter = () => {
    const cellule = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [["Panier", "Date", "Client", "Téléphone", "Région", "Statut", "Total"],
      ...lignes.map((r) => [r.reference, r.dateIso, r.client, r.telephone, r.region, r.statut.label, r.totalBrut])].map((l) => l.map(cellule).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `paniers-abandonnes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const colonnes: Column<LignePanier>[] = [
    { id: "reference", header: t("Paiement"), cell: (r) => r.reference, mobilePrimary: true },
    { id: "date", header: t("Date de création"), cell: (r) => r.date },
    { id: "client", header: t("Nom du client"), cell: (r) => r.client },
    { id: "region", header: t("Région"), cell: (r) => r.region, hideOnMobile: true },
    { id: "statut", header: t("Statut de récupération"), cell: (r) => <Badge tone={r.statut.tone}>{r.statut.label}</Badge> },
    { id: "total", header: t("Total"), cell: (r) => r.total, numeric: true, align: "end" },
    {
      id: "action", header: "", align: "end",
      cell: (r) => r.commandeId
        ? <Button size="sm" variant="plain" href={`/dashboard/commandes/${r.commandeId}`}>{t("Voir la commande")}</Button>
        : <Button size="sm" disabled={!r.relancable || enCours !== null} loading={enCours === r.id} onClick={() => relancer(r)}
            title={r.refus ? t("Ce client a refusé les relances") : undefined}>{t("Relancer sur WhatsApp")}</Button>,
    },
  ];
  const debut = total ? (page - 1) * parPage + 1 : 0;
  const fin = Math.min(page * parPage, total);

  return (
    <div className="space-y-4">
      <PageHeader icon="orders" title={t("Paniers abandonnés")} backHref="/dashboard/commandes"
        secondaryActions={vide ? [] : [{ content: t("Exporter"), icon: "export", disabled: lignes.length === 0, onAction: exporter }]} />
      {vide ? (
        <EmptyState title={t("Aucun panier abandonné pour l'instant")} image={<IllustrationCommandes />}>
          {t("Quand un acheteur saisit son nom et son téléphone au paiement sans valider sa commande, son panier apparaît ici pour que vous puissiez le relancer sur WhatsApp.")}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-(--radius-xl) bg-(--color-surface) shadow-(--shadow-card)">
          <IndexFilters views={vues} searchPlaceholder={t("Rechercher par nom ou téléphone")} />
          <IndexTable
            label={t("Paniers abandonnés")}
            rows={lignes}
            columns={colonnes}
            getId={(r) => r.id}
            emptyState={<div className="border-t border-(--color-border-secondary) px-6 py-12 text-center text-(--color-text-secondary)">{t("Aucun panier ne correspond à ces filtres.")}</div>}
            pagination={total > parPage ? {
              hasPrevious: page > 1, hasNext: fin < total, label: `${debut}-${fin} / ${total}`,
              onPrevious: () => aller({ page: page - 1 > 1 ? String(page - 1) : null }),
              onNext: () => aller({ page: String(page + 1) }),
            } : undefined}
          />
        </div>
      )}
    </div>
  );
}

export function ListePaniers(props: Props) {
  return <Suspense fallback={null}><Liste {...props} /></Suspense>;
}
