"use client";
// Liste des commandes (masterprompt §8.2) : vues, recherche, filtres et tri dans l'URL,
// données chargées par la page serveur. Textes reçus déjà traduits.
import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/components/I18nProvider";
import {
  Badge, Button, EmptyState, IndexFilters, IndexTable, majRecherche, useColonnesMasquees,
  type Column, type Filtre, type StatutBadge, type Tri, type Vue,
} from "@/components/ui/adm";
import { IllustrationCommandes } from "@/components/ui/illustrations";

export type LigneCommande = {
  id: string;
  reference: string;
  date: string;
  client: string;
  lieu: string;
  produits: string;
  total: string;
  methode: string;
  paiement: StatutBadge;
  statut: StatutBadge;
};

type Props = {
  lignes: LigneCommande[];
  vues: Vue[];
  filtres: Filtre[];
  tri: Tri;
  page: number;
  total: number;
  parPage: number;
  /** Au moins un filtre, une vue ou une recherche actif. */
  filtre: boolean;
  urlBoutique: string | null;
};

function Liste({ lignes, vues, filtres, tri, page, total, parPage, filtre, urlBoutique }: Props) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [masquees, setMasquees] = useColonnesMasquees("commandes", ["lieu"]);
  const aller = (patch: Record<string, string | null>) => {
    const qs = majRecherche(params.toString(), patch);
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const colonnes: Column<LigneCommande>[] = [
    { id: "reference", header: t("Commande"), cell: (r) => r.reference, mobilePrimary: true },
    { id: "date", header: t("Date"), cell: (r) => r.date, sortable: true },
    { id: "client", header: t("Client"), cell: (r) => r.client, sortable: true },
    { id: "lieu", header: t("Ville"), cell: (r) => r.lieu, hideOnMobile: true },
    { id: "total", header: t("Total"), cell: (r) => r.total, numeric: true, align: "end", sortable: true },
    { id: "paiement", header: t("Statut du paiement"), cell: (r) => <Badge tone={r.paiement.tone} progress={r.paiement.progress}>{r.paiement.label}</Badge> },
    { id: "statut", header: t("Statut du traitement"), cell: (r) => <Badge tone={r.statut.tone} progress={r.statut.progress}>{r.statut.label}</Badge> },
    { id: "produits", header: t("Articles"), cell: (r) => <span className="line-clamp-1 max-w-[240px]">{r.produits}</span>, hideOnMobile: true },
    { id: "methode", header: t("Moyen de paiement"), cell: (r) => r.methode, hideOnMobile: true },
  ];
  const debut = total ? (page - 1) * parPage + 1 : 0;
  const fin = Math.min(page * parPage, total);

  // Filtres sans résultat : message dans la carte de la liste (pas de seconde carte).
  const sansResultat = (
    <div className="flex flex-col items-center gap-3 border-t border-(--color-border-secondary) px-6 py-12 text-center">
      <p className="text-sm font-[650] text-(--color-text-strong)">{t("Aucune commande ne correspond à ces filtres")}</p>
      <p className="text-(--color-text-secondary)">{t("Modifiez la recherche ou retirez un filtre.")}</p>
      <Button href="/dashboard/commandes">{t("Voir toutes les commandes")}</Button>
    </div>
  );
  const vide = (
    <EmptyState title={t("Aucune commande pour l'instant")} image={<IllustrationCommandes />}
      actions={urlBoutique ? <Button variant="primary" icon="external" href="/dashboard/boutique">{t("Voir ma boutique")}</Button> : null}>
      {t("Les commandes passées dans votre boutique ou en caisse apparaîtront ici. Partagez le lien de votre boutique pour recevoir les premières.")}
    </EmptyState>
  );

  // Aucune commande du tout : pas de barre de filtres, l'état vide suffit.
  if (!filtre && lignes.length === 0) return vide;

  return (
    <div className="overflow-hidden rounded-(--radius-xl) bg-(--color-surface) shadow-(--shadow-card)">
      <IndexFilters
        views={vues}
        filters={filtres}
        sortOptions={colonnes.filter((c) => c.sortable).map((c) => ({ id: c.id, label: c.header }))}
        columns={colonnes.filter((c) => !c.mobilePrimary).map((c) => ({ id: c.id, header: c.header }))}
        hiddenColumns={masquees}
        onHiddenColumnsChange={setMasquees}
        searchPlaceholder={t("Rechercher par n°, client, téléphone ou e-mail")}
      />
      <IndexTable
        label={t("Commandes")}
        rows={lignes}
        columns={colonnes}
        getId={(r) => r.id}
        hiddenColumns={masquees}
        onRowClick={(r) => router.push(`/dashboard/commandes/${r.id}`)}
        sort={tri}
        onSort={(nt) => aller({ tri: `${nt.colonne}:${nt.ordre}`, page: null })}
        emptyState={sansResultat}
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

export function ListeCommandes(props: Props) {
  // IndexFilters lit useSearchParams : il doit être sous <Suspense>.
  return <Suspense fallback={null}><Liste {...props} /></Suspense>;
}
