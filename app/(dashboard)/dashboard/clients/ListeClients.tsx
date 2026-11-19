"use client";
// Liste des clients (masterprompt §8.9) : recherche, tri et page dans l'URL, ligne → fiche client.
import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/components/I18nProvider";
import {
  Avatar, Badge, Button, EmptyState, IndexFilters, IndexTable, majRecherche, useColonnesMasquees,
  type BadgeTone, type Column, type Tri,
} from "@/components/ui/adm";
import { IllustrationClients } from "@/components/ui/illustrations";

export type LigneClient = {
  id: string;
  nom: string;
  contact: string;
  lieu: string;
  commandes: number;
  depense: string;
  segment: { label: string; tone: BadgeTone };
  derniere: string;
};

type Props = { lignes: LigneClient[]; tri: Tri; page: number; total: number; parPage: number; recherche: boolean };

function Liste({ lignes, tri, page, total, parPage, recherche }: Props) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [masquees, setMasquees] = useColonnesMasquees("clients", []);
  const aller = (patch: Record<string, string | null>) => {
    const qs = majRecherche(params.toString(), patch);
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const colonnes: Column<LigneClient>[] = [
    { id: "nom", header: t("Nom du client"), sortable: true, mobilePrimary: true,
      cell: (r) => <span className="flex items-center gap-2"><Avatar name={r.nom} size={24} />{r.nom}</span> },
    { id: "contact", header: t("Contact"), cell: (r) => r.contact, hideOnMobile: true },
    { id: "lieu", header: t("Emplacement"), cell: (r) => r.lieu },
    { id: "commandes", header: t("Commandes"), cell: (r) => r.commandes, numeric: true, align: "end" },
    { id: "depense", header: t("Montant dépensé"), cell: (r) => r.depense, numeric: true, align: "end", sortable: true },
    { id: "segment", header: t("Segment"), cell: (r) => <Badge tone={r.segment.tone}>{r.segment.label}</Badge> },
    { id: "derniere", header: t("Dernière commande"), cell: (r) => r.derniere, hideOnMobile: true },
  ];
  const debut = total ? (page - 1) * parPage + 1 : 0;
  const fin = Math.min(page * parPage, total);

  if (!recherche && lignes.length === 0) {
    return (
      <EmptyState title={t("Aucun client encore")} image={<IllustrationClients />}
        actions={<Button variant="primary" icon="external" href="/dashboard/boutique">{t("Voir ma boutique")}</Button>}>
        {t("Vos clients apparaîtront ici dès leur première commande.")}
      </EmptyState>
    );
  }

  return (
    <div className="overflow-hidden rounded-(--radius-xl) bg-(--color-surface) shadow-(--shadow-card)">
      <IndexFilters
        views={[{ id: "tous", label: t("Tous les clients") }]}
        filters={[]}
        sortOptions={[
          { id: "depense", label: t("Montant dépensé") },
          { id: "nom", label: t("Nom du client") },
          { id: "inscrit", label: t("Date d'inscription") },
        ]}
        columns={colonnes.filter((c) => !c.mobilePrimary).map((c) => ({ id: c.id, header: c.header }))}
        hiddenColumns={masquees}
        onHiddenColumnsChange={setMasquees}
        searchPlaceholder={t("Rechercher par nom, e-mail ou téléphone")}
      />
      <IndexTable
        label={t("Clients")}
        rows={lignes}
        columns={colonnes}
        getId={(r) => r.id}
        hiddenColumns={masquees}
        onRowClick={(r) => router.push(`/dashboard/clients/${r.id}`)}
        sort={tri}
        onSort={(nt) => aller({ tri: `${nt.colonne}:${nt.ordre}`, page: null })}
        emptyState={
          <div className="flex flex-col items-center gap-3 border-t border-(--color-border-secondary) px-6 py-12 text-center">
            <p className="text-sm font-[650] text-(--color-text-strong)">{t("Aucun client ne correspond à cette recherche")}</p>
            <Button href="/dashboard/clients">{t("Voir tous les clients")}</Button>
          </div>
        }
        pagination={total > parPage ? {
          hasPrevious: page > 1,
          hasNext: fin < total,
          label: `${debut}-${fin} / ${total}`,
          onPrevious: () => aller({ page: page - 1 > 1 ? String(page - 1) : null }),
          onNext: () => aller({ page: String(page + 1) }),
        } : undefined}
      />
    </div>
  );
}

export function ListeClients(props: Props) {
  return <Suspense fallback={null}><Liste {...props} /></Suspense>;
}
