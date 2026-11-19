"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18nProvider";
import { useConfirmation } from "@/components/ui";
import { Button, buttonClasses } from "@/components/ui/adm";
import { Icon, type IconName } from "@/components/ui/icones";
import { statutCommande } from "@/app/(dashboard)/dashboard/commandes/statuts";

// Prochaine étape proposée pour chaque statut (les transitions autorisées restent
// vérifiées par l'API : lib/commandes.ts TRANSITIONS_VALIDES). Annuler reste possible à tout moment.
const NEXT_ACTION: Record<string, { label: string; nextStatut: string; icon: IconName }> = {
  en_attente:     { label: "Confirmer la commande",  nextStatut: "confirmee", icon: "checkCircle" },
  confirmee:      { label: "Passer en livraison",    nextStatut: "expediee",  icon: "truck" },
  en_preparation: { label: "Passer en livraison",    nextStatut: "expediee",  icon: "truck" },
  expediee:       { label: "Marquer comme livrée",   nextStatut: "livree",    icon: "checkCircle" },
};

const ANNULABLE = new Set(["en_attente", "confirmee", "en_preparation", "expediee", "tentative_echouee"]);

interface Props {
  commandeId: string;
  statutActuel: string;
  /** Payée en ligne : l'annulation rembourse le client et reprend la vente au portefeuille. */
  payeeEnLigne?: boolean;
  /** Numéro affiché dans la confirmation d'annulation. */
  numero?: string;
}

export function StatutCommandeSelector({ commandeId, statutActuel, payeeEnLigne = false, numero }: Props) {
  const t = useT();
  const router = useRouter();
  const [statut, setStatut] = useState(statutActuel);
  const [loading, setLoading] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [notifEnvoyee, setNotifEnvoyee] = useState(false);
  const { confirmer, dialogue } = useConfirmation();
  const nextAction = NEXT_ACTION[statut];

  async function changerStatut(nouveau: string) {
    if (nouveau === statut) return;
    setLoading(nouveau);
    setWhatsappUrl(null);
    setNotifEnvoyee(false);
    try {
      const res = await fetch(`/api/commandes/${commandeId}/statut`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: nouveau }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("Le statut n'a pas pu être changé. Rechargez la page puis réessayez."));
      setStatut(nouveau);
      const label = t(statutCommande(nouveau).label);
      if (data.envoyeAuto) {
        setNotifEnvoyee(true);
        toast.success(t("Commande passée à « {0} ». Le client a été prévenu sur WhatsApp.", label));
      } else {
        if (data.whatsappUrl) setWhatsappUrl(data.whatsappUrl);
        toast.success(t("Commande passée à « {0} ».", label));
      }
      router.refresh();
    } catch (err: any) {
      toast.error(t(err.message));
    } finally {
      setLoading(null);
    }
  }

  async function annuler() {
    const ok = await confirmer({
      titre: t("Annuler cette commande ?"),
      objet: numero ? t("Commande {0}", numero) : t("Cette commande"),
      description: payeeEnLigne
        ? t("Le client sera remboursé et la vente reprise sur votre portefeuille. Cette action est définitive.")
        : t("Le stock sera remis en vente. Cette action est définitive."),
      libelleConfirmer: t("Annuler la commande"),
    });
    if (ok) await changerStatut("annulee");
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {ANNULABLE.has(statut) && (
        <Button onClick={annuler} disabled={loading !== null} loading={loading === "annulee"} icon="x">
          {t("Annuler la commande")}
        </Button>
      )}

      {notifEnvoyee && (
        <span role="status" className="inline-flex items-center gap-1.5 text-xs font-[550] text-(--badge-success-text)">
          <Icon name="checkCircle" />{t("Client prévenu sur WhatsApp")}
        </span>
      )}
      {whatsappUrl && !notifEnvoyee && (
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses()} onClick={() => setWhatsappUrl(null)}>
          <Icon name="whatsapp" />
          {t("Prévenir le client sur WhatsApp")}
        </a>
      )}

      {nextAction && (
        <Button variant="primary" onClick={() => changerStatut(nextAction.nextStatut)} disabled={loading !== null}
          loading={loading === nextAction.nextStatut} icon={nextAction.icon}>
          {t(nextAction.label)}
        </Button>
      )}
      {dialogue}
    </div>
  );
}
