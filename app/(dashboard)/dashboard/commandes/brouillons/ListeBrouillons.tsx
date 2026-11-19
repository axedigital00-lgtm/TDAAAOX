"use client";
// Liste des commandes provisoires : vues et recherche dans l'URL, ligne cliquable → fiche.
import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/components/I18nProvider";
import { Badge, Button, EmptyState, IndexFilters, IndexTable, PageHeader, majRecherche, type Column, type Vue } from "@/components/ui/adm";
import { IllustrationBrouillons } from "@/components/ui/illustrations";

export type LigneListeBrouillon = {
  id: string; reference: string; date: string; client: string; total: string;
  statut: { label: string; tone: "attention" | "info" | "success"; progress: "incomplete" | "partial" | "complete" };
};
type Props = { lignes: LigneListeBrouillon[]; vues: Vue[]; page: number; total: number; parPage: number; vide: boolean };

function Liste({ lignes, vues, page, total, parPage, vide }: Props) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const aller = (patch: Record<string, string | null>) => {
    const qs = majRecherche(params.toString(), patch);
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const creer = { content: t("Créer une commande provisoire"), href: "/dashboard/commandes/brouillons/nouveau" };
  const colonnes: Column<LigneListeBrouillon>[] = [
    { id: "reference", header: t("Brouillon"), cell: (r) => r.reference, mobilePrimary: true },
    { id: "date", header: t("Date"), cell: (r) => r.date },
    { id: "client", header: t("Client"), cell: (r) => r.client },
    { id: "statut", header: t("Statut"), cell: (r) => <Badge tone={r.statut.tone} progress={r.statut.progress}>{r.statut.label}</Badge> },
    { id: "total", header: t("Total"), cell: (r) => r.total, numeric: true, align: "end" },
  ];
  const debut = total ? (page - 1) * parPage + 1 : 0;
  const fin = Math.min(page * parPage, total);

  return (
    <div className="space-y-4">
      <PageHeader icon="orders" title={t("Commandes provisoires")} backHref="/dashboard/commandes" primaryAction={vide ? undefined : creer} />
      {vide ? (
        <EmptyState
          title={t("Créer manuellement des commandes et des factures")}
          image={<IllustrationBrouillons />}
          actions={<Button variant="primary" href={creer.href}>{creer.content}</Button>}
        >
          {t("Utilisez les commandes provisoires pour prendre des commandes reçues par téléphone ou WhatsApp, envoyer un récapitulatif au client et suivre le paiement à la livraison.")}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-(--radius-xl) bg-(--color-surface) shadow-(--shadow-card)">
          <IndexFilters views={vues} searchPlaceholder={t("Rechercher par client ou téléphone")} />
          <IndexTable
            label={t("Commandes provisoires")}
            rows={lignes}
            columns={colonnes}
            getId={(r) => r.id}
            onRowClick={(r) => router.push(`/dashboard/commandes/brouillons/${r.id}`)}
            emptyState={
              <div className="border-t border-(--color-border-secondary) px-6 py-12 text-center text-(--color-text-secondary)">
                {t("Aucune commande provisoire ne correspond à ces filtres.")}
              </div>
            }
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

export function ListeBrouillons(props: Props) {
  return <Suspense fallback={null}><Liste {...props} /></Suspense>;
}
