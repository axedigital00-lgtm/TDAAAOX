"use client";
// Liste des produits (masterprompt §8.6) : vues, recherche, filtres et tri dans l'URL,
// données chargées par la page serveur. Textes reçus déjà traduits.
import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/components/I18nProvider";
import {
  Badge, Button, EmptyState, IndexFilters, IndexTable, PageHeader, Thumbnail, majRecherche, useColonnesMasquees,
  type Column, type Filtre, type StatutBadge, type Tri, type Vue,
} from "@/components/ui/adm";
import { IllustrationProduits } from "@/components/ui/illustrations";
import { ImportProduitsExcel } from "@/components/dashboard/ImportProduitsExcel";
import { AgentActiveIndicator } from "@/components/dashboard/AgentActiveIndicator";
import { ActiverExemple } from "./ActiverExemple";

export type LigneProduit = {
  id: string;
  nom: string;
  image: string | null;
  statut: StatutBadge;
  /** Stock lisible (« 12 en stock », « Sans stock à gérer »). */
  stock: string;
  alerteStock: StatutBadge | null;
  categorie: string;
  type: string;
  prix: string;
  ventes: number;
  avis: number;
  /** Exemple d'Axia à activer : données pour la fenêtre d'activation. */
  exemple: { prix: number; image?: string; digital: boolean } | null;
};

type Props = {
  lignes: LigneProduit[];
  vues: Vue[];
  filtres: Filtre[];
  tri: Tri;
  page: number;
  total: number;
  parPage: number;
  filtre: boolean;
};

export function EnTeteProduits() {
  const t = useT();
  const [importer, setImporter] = useState(false);
  return (
    <>
      <PageHeader
        icon="tag"
        title={t("Produits")}
        titleMeta={<AgentActiveIndicator label={t("Agent Produits actif")} />}
        primaryAction={{ content: t("Ajouter un produit"), icon: "plus", href: "/dashboard/produits/nouveau" }}
        secondaryActions={[
          { content: t("Importer depuis Excel"), icon: "import", onAction: () => setImporter(true) },
          { content: t("Collections"), href: "/dashboard/produits/categories" },
        ]}
        overflowActions={[
          { content: t("Produits numériques"), href: "/dashboard/produits/digital" },
          { content: t("Imports IA"), href: "/dashboard/produits/imports-ia" },
          { content: t("Studio"), href: "/dashboard/produits/studio" },
          { content: t("Revoir le tutoriel"), onAction: () => window.dispatchEvent(new CustomEvent("axso:ouvrir-tutoriel", { detail: "produits" })) },
        ]}
      />
      <ImportProduitsExcel open={importer} onClose={() => setImporter(false)} />
    </>
  );
}

function Liste({ lignes, vues, filtres, tri, page, total, parPage, filtre }: Props) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [masquees, setMasquees] = useColonnesMasquees("produits", ["ventes"]);
  const aller = (patch: Record<string, string | null>) => {
    const qs = majRecherche(params.toString(), patch);
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const colonnes: Column<LigneProduit>[] = [
    { id: "nom", header: t("Produit"), sortable: true, mobilePrimary: true, cell: (r) => (
      <span className="flex items-center gap-3">
        <Thumbnail src={r.image} alt={r.nom} size={40} />
        <span className="line-clamp-2">{r.nom}</span>
      </span>
    ) },
    { id: "statut", header: t("Statut"), cell: (r) => <Badge tone={r.statut.tone}>{r.statut.label}</Badge> },
    { id: "stock", header: t("Stock"), sortable: true, cell: (r) => r.exemple
      ? <ActiverExemple id={r.id} nom={r.nom} prix={r.exemple.prix} image={r.exemple.image} digital={r.exemple.digital} />
      : r.alerteStock
        ? <span className="flex items-center gap-2">
            <Badge tone={r.alerteStock.tone}>{r.alerteStock.label}</Badge><span>{r.stock}</span>
            <Button size="sm" variant="plain" href={`/dashboard/produits/${r.id}#stock`}>{t("Mettre à jour")}</Button>
          </span>
        : r.stock },
    { id: "categorie", header: t("Collection"), cell: (r) => r.categorie, hideOnMobile: true },
    { id: "type", header: t("Type"), cell: (r) => r.type, hideOnMobile: true },
    { id: "prix", header: t("Prix"), cell: (r) => r.prix, numeric: true, align: "end", sortable: true },
    { id: "ventes", header: t("Ventes"), cell: (r) => r.ventes, numeric: true, align: "end", sortable: true, hideOnMobile: true },
    { id: "avis", header: t("Avis"), cell: (r) => r.avis || "—", numeric: true, align: "end", hideOnMobile: true },
  ];
  const debut = total ? (page - 1) * parPage + 1 : 0;
  const fin = Math.min(page * parPage, total);

  const sansResultat = (
    <div className="flex flex-col items-center gap-3 border-t border-(--color-border-secondary) px-6 py-12 text-center">
      <p className="text-sm font-[650] text-(--color-text-strong)">{t("Aucun produit ne correspond à ces filtres")}</p>
      <p className="text-(--color-text-secondary)">{t("Modifiez la recherche ou retirez un filtre.")}</p>
      <Button href="/dashboard/produits">{t("Voir tous les produits")}</Button>
    </div>
  );

  if (!filtre && lignes.length === 0) return (
    <EmptyState title={t("Vous n'avez pas encore de produit")} image={<IllustrationProduits />}
      actions={<Button variant="primary" icon="plus" href="/dashboard/produits/nouveau">{t("Ajouter un produit")}</Button>}>
      {t("Ajoutez votre premier produit pour commencer à vendre, ou importez votre catalogue depuis un fichier Excel.")}
    </EmptyState>
  );

  return (
    <div className="overflow-hidden rounded-(--radius-xl) bg-(--color-surface) shadow-(--shadow-card)">
      <IndexFilters
        views={vues}
        filters={filtres}
        sortOptions={colonnes.filter((c) => c.sortable).map((c) => ({ id: c.id, label: c.header }))}
        columns={colonnes.filter((c) => !c.mobilePrimary).map((c) => ({ id: c.id, header: c.header }))}
        hiddenColumns={masquees}
        onHiddenColumnsChange={setMasquees}
        searchPlaceholder={t("Rechercher par nom, référence ou collection")}
      />
      <IndexTable
        label={t("Produits")}
        rows={lignes}
        columns={colonnes}
        getId={(r) => r.id}
        hiddenColumns={masquees}
        onRowClick={(r) => router.push(`/dashboard/produits/${r.id}`)}
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

export function ListeProduits(props: Props) {
  return <Suspense fallback={null}><Liste {...props} /></Suspense>;
}
