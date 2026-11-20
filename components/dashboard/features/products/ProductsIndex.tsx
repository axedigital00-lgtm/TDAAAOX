"use client";
// Table des produits avec actions groupées (§8.6) : changement d'état via
// l'API existante PATCH /api/produits/[id] ({ actif }).

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IndexTable, type IndexColumn, type IndexRow } from "@/components/dashboard/design-system/components/IndexTable";

const ACTIONS = [
  { id: "actif", content: "Définir comme actif" },
  { id: "brouillon", content: "Définir comme brouillon" },
];

export function ProductsIndex({ columns, rows, pagination, emptyState }: {
  columns: IndexColumn[];
  rows: IndexRow[];
  pagination?: { label: string; previousHref?: string; nextHref?: string };
  emptyState?: React.ReactNode;
}) {
  const router = useRouter();
  const changer = async (action: string, ids: string[]) => {
    const resultats = await Promise.all(ids.map((id) =>
      fetch(`/api/produits/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actif: action === "actif" }) })
        .then((r) => r.ok).catch(() => false)));
    const ok = resultats.filter(Boolean).length;
    if (ok) toast.success(`${ok} produit${ok > 1 ? "s" : ""} ${action === "actif" ? "activé" : "passé en brouillon"}${ok > 1 ? "s" : ""}`);
    if (ok < ids.length) toast.error(`${ids.length - ok} produit${ids.length - ok > 1 ? "s" : ""} n’ont pas pu être modifiés.`);
    router.refresh();
  };
  return <IndexTable columns={columns} rows={rows} pagination={pagination} emptyState={emptyState} bulkActions={ACTIONS} onBulkAction={changer} />;
}
