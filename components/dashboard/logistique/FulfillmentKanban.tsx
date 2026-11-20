"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { GripVertical, Clock, CheckCircle, Package, Truck, AlertTriangle, PackageCheck } from "lucide-react";
import { TRANSITIONS_VALIDES } from "@/lib/commandes";
import { formatMontant } from "@/lib/utils";
import { useT } from "@/components/I18nProvider";

interface CommandeKanban {
  id: string;
  numero: string;
  clientNom: string;
  montantTotal: number;
  devise: string;
  statut: string;
  createdAt: string;
}

const COLONNES: { statut: string; label: string; color: string; Icon: any }[] = [
  { statut: "en_attente", label: "En attente", color: "#f59e0b", Icon: Clock },
  { statut: "confirmee", label: "Confirmée", color: "#60a5fa", Icon: CheckCircle },
  { statut: "en_preparation", label: "En préparation", color: "#8b5cf6", Icon: Package },
  { statut: "expediee", label: "Expédiée", color: "#3b82f6", Icon: Truck },
  { statut: "tentative_echouee", label: "Échec livraison", color: "#ef4444", Icon: AlertTriangle },
  { statut: "livree", label: "Livrée", color: "#10b981", Icon: PackageCheck },
];

export function FulfillmentKanban() {
  const t = useT();
  const [commandes, setCommandes] = useState<CommandeKanban[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const charger = useCallback(() => {
    fetch("/api/commandes?limit=100")
      .then((r) => r.json())
      .then((d) => setCommandes(d.commandes ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { charger(); }, [charger]);

  async function deplacer(commandeId: string, nouveauStatut: string) {
    const commande = commandes.find((c) => c.id === commandeId);
    if (!commande) return;
    if (commande.statut === nouveauStatut) return;

    const transitionsValides = TRANSITIONS_VALIDES[commande.statut] || [];
    if (!transitionsValides.includes(nouveauStatut)) {
      toast.error(t("Transition impossible : {0} → {1}", commande.statut, nouveauStatut));
      return;
    }

    // Optimiste
    setCommandes((prev) => prev.map((c) => (c.id === commandeId ? { ...c, statut: nouveauStatut } : c)));

    const res = await fetch(`/api/commandes/${commandeId}/statut`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: nouveauStatut }),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(t(d.error) || t("Erreur lors du changement de statut"));
      charger(); // rollback en rechargeant l'état réel
    } else {
      toast.success(t("Commande #{0} → {1}", commande.numero, COLONNES.find((c) => c.statut === nouveauStatut)?.label));
    }
  }

  if (loading) return <p className="axd-fichiers__etat">{t("Chargement…")}</p>;

  return (
    <div className="axd-kanban">
      {COLONNES.map((col) => {
        const cartes = commandes.filter((c) => c.statut === col.statut);
        return (
          <div
            key={col.statut}
            className="axd-kanban__col"
            data-survol={dragOverCol === col.statut || undefined}
            onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.statut); }}
            onDragLeave={() => setDragOverCol((c) => (c === col.statut ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverCol(null);
              if (dragId) deplacer(dragId, col.statut);
            }}
          >
            <div className="axd-kanban__tete">
              <col.Icon size={14} />
              <span>{t(col.label)}</span>
              <span className="axd-kanban__nb">{cartes.length}</span>
            </div>
            <div className="axd-kanban__liste">
              {cartes.length === 0 && <p className="axd-kanban__vide">{t("Aucune commande")}</p>}
              {cartes.map((c) => (
                <div key={c.id} draggable onDragStart={() => setDragId(c.id)} onDragEnd={() => setDragId(null)}
                  className="axd-kanban__carte" style={{ opacity: dragId === c.id ? 0.4 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <a href={`/dashboard/commandes/${c.id}`} className="axd-kanban__num">{c.numero}</a>
                      <p className="axd-kanban__client">{t(c.clientNom)}</p>
                    </div>
                    <GripVertical size={13} style={{ color: "var(--color-icon)", flex: "none" }} aria-hidden />
                  </div>
                  <p className="axd-kanban__total">{formatMontant(c.montantTotal, c.devise)}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
