"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { GripVertical, Clock, CheckCircle, Package, Truck, AlertTriangle, PackageCheck } from "lucide-react";
import { TRANSITIONS_VALIDES } from "@/lib/commandes";
import { formatMontant, cn } from "@/lib/utils";
import { useT } from "@/components/I18nProvider";
import { CLASSE_SAISIE, EtatErreur, SqueletteListe, TONS, type Ton } from "@/components/ui";

interface CommandeKanban {
  id: string;
  numero: string;
  clientNom: string;
  montantTotal: number;
  devise: string;
  statut: string;
  createdAt: string;
}

const COLONNES: { statut: string; label: string; ton: Ton; Icon: any }[] = [
  { statut: "en_attente", label: "En attente", ton: "attention", Icon: Clock },
  { statut: "confirmee", label: "Confirmée", ton: "info", Icon: CheckCircle },
  { statut: "en_preparation", label: "En préparation", ton: "attention", Icon: Package },
  { statut: "expediee", label: "En livraison", ton: "info", Icon: Truck },
  { statut: "tentative_echouee", label: "Échec livraison", ton: "erreur", Icon: AlertTriangle },
  { statut: "livree", label: "Livrée", ton: "succes", Icon: PackageCheck },
];

const LIBELLES: Record<string, string> = Object.fromEntries(COLONNES.map((c) => [c.statut, c.label]));

export function FulfillmentKanban() {
  const t = useT();
  const [commandes, setCommandes] = useState<CommandeKanban[]>([]);
  const [loading, setLoading] = useState(true);
  const [echec, setEchec] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const charger = useCallback(() => {
    setEchec(false);
    fetch("/api/commandes?limit=100")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => setCommandes(d.commandes ?? []))
      .catch(() => setEchec(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { charger(); }, [charger]);

  async function deplacer(commandeId: string, nouveauStatut: string) {
    const commande = commandes.find((c) => c.id === commandeId);
    if (!commande) return;
    if (commande.statut === nouveauStatut) return;

    const transitionsValides = TRANSITIONS_VALIDES[commande.statut] || [];
    if (!transitionsValides.includes(nouveauStatut)) {
      toast.error(t("Une commande « {0} » ne peut pas passer directement à « {1} ».", t(LIBELLES[commande.statut] ?? commande.statut), t(LIBELLES[nouveauStatut] ?? nouveauStatut)));
      return;
    }

    // Optimiste
    setCommandes((prev) => prev.map((c) => (c.id === commandeId ? { ...c, statut: nouveauStatut } : c)));

    const res = await fetch(`/api/commandes/${commandeId}/statut`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: nouveauStatut }),
    }).catch(() => null);

    if (!res?.ok) {
      const d = await res?.json().catch(() => ({}));
      toast.error(d?.error ? t(d.error) : t("Le statut de la commande n'a pas pu être changé. Réessaie."));
      charger(); // rollback en rechargeant l'état réel
    } else {
      toast.success(t("Commande #{0} passée à « {1} ».", commande.numero, t(LIBELLES[nouveauStatut] ?? nouveauStatut)));
    }
  }

  if (loading) return <SqueletteListe lignes={4} libelle={t("Chargement des commandes…")} />;
  if (echec) return <EtatErreur titre={t("Les commandes n'ont pas pu être chargées")} texte={t("Vérifie ta connexion puis réessaie.")} onReessayer={() => { setLoading(true); charger(); }} />;

  return (
    <>
      <p className="ax-aide">{t("Glisse une carte vers une autre colonne, ou choisis l'étape suivante sous la commande (pratique sur téléphone).")}</p>
      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-4" style={{ scrollbarWidth: "thin" }}>
        {COLONNES.map((col) => {
          const cartes = commandes.filter((c) => c.statut === col.statut);
          const survole = dragOverCol === col.statut;
          return (
            <section
              key={col.statut}
              aria-label={t(col.label)}
              className={cn("w-[85vw] max-w-72 shrink-0 snap-start rounded-carte border transition-colors sm:w-72",
                survole ? "border-primaire bg-primaire-fond" : "border-bordure bg-carte-2")}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.statut); }}
              onDragLeave={() => setDragOverCol((c) => (c === col.statut ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverCol(null);
                if (dragId) deplacer(dragId, col.statut);
              }}
            >
              <h3 className="flex items-center gap-2 border-b border-bordure px-4 py-3">
                <span className={cn("flex size-6 items-center justify-center rounded-full border", TONS[col.ton])} aria-hidden><col.Icon className="size-3.5" /></span>
                <span className="text-sm font-bold text-encre">{t(col.label)}</span>
                <span className="ml-auto text-xs font-semibold tabular-nums text-doux">{cartes.length}</span>
              </h3>

              <div className="min-h-[80px] space-y-2 p-2.5">
                {cartes.length === 0 && (
                  <p className="py-6 text-center ax-aide">{t("Aucune commande")}</p>
                )}
                {cartes.map((c) => {
                  // L'annulation reste sur la page Commandes (remboursement, confirmation).
                  const suivants = (TRANSITIONS_VALIDES[c.statut] ?? []).filter((s) => s !== "annulee");
                  return (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={() => setDragId(c.id)}
                      onDragEnd={() => setDragId(null)}
                      className={cn("cursor-grab rounded-controle border border-bordure bg-carte p-3 transition-shadow hover:shadow-carte active:cursor-grabbing", dragId === c.id && "opacity-40")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-bold text-encre">#{c.numero}</p>
                          <p className="mt-0.5 truncate text-sm text-doux">{t(c.clientNom)}</p>
                        </div>
                        <GripVertical className="mt-0.5 size-4 shrink-0 text-discret" aria-hidden />
                      </div>
                      <p className="mt-2 text-sm font-bold tabular-nums text-encre">{formatMontant(c.montantTotal, c.devise)}</p>
                      {suivants.length > 0 && (
                        <select aria-label={t("Changer l'étape de la commande #{0}", c.numero)} value=""
                          onChange={(e) => e.target.value && deplacer(c.id, e.target.value)}
                          className={cn(CLASSE_SAISIE, "mt-2 text-sm")}>
                          <option value="">{t("Passer à…")}</option>
                          {suivants.map((s) => <option key={s} value={s}>{t(LIBELLES[s] ?? s)}</option>)}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
