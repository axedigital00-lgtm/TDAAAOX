"use client";
// Table des commandes avec actions groupées (§8.2). Les changements de statut
// passent par l'API existante PATCH /api/commandes/[id]/statut, qui applique
// les règles de transition métier (lib/commandes.ts).

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IndexTable, type IndexColumn, type IndexRow } from "@/components/dashboard/design-system/components/IndexTable";

const ACTIONS = [
  { id: "confirmee", content: "Confirmer" },
  { id: "en_preparation", content: "Marquer comme en préparation" },
  { id: "expediee", content: "Marquer comme expédiées" },
];

export function OrdersIndex({ columns, rows, pagination, emptyState }: {
  columns: IndexColumn[];
  rows: IndexRow[];
  pagination?: { label: string; previousHref?: string; nextHref?: string };
  emptyState?: React.ReactNode;
}) {
  const router = useRouter();
  const changerStatut = async (statut: string, ids: string[]) => {
    const resultats = await Promise.all(ids.map((id) =>
      fetch(`/api/commandes/${id}/statut`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statut }) })
        .then((r) => r.ok).catch(() => false)));
    const ok = resultats.filter(Boolean).length;
    const libelle = ACTIONS.find((a) => a.id === statut)?.content.toLowerCase() ?? statut;
    if (ok) toast.success(`${ok} commande${ok > 1 ? "s" : ""} mise${ok > 1 ? "s" : ""} à jour`);
    if (ok < ids.length) toast.error(`${ids.length - ok} commande${ids.length - ok > 1 ? "s" : ""} n’ont pas pu être modifiées (${libelle} impossible depuis leur statut).`);
    router.refresh();
  };
  return (
    <IndexTable columns={columns} rows={rows} pagination={pagination} emptyState={emptyState}
      bulkActions={ACTIONS} onBulkAction={changerStatut} resourceName={{ singular: "commande", plural: "commandes" }} />
  );
}
