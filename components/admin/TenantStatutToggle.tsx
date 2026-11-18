"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, CheckCircle2, Loader2 } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { useConfirmation } from "@/components/command-center/Confirmation";

// Suspendre / réactiver une boutique depuis la liste (Super admin) : confirmation qui nomme la boutique.
export function TenantStatutToggle({ tenantId, statutActuel, nomBoutique }: { tenantId: string; statutActuel: string; nomBoutique: string }) {
  const t = useT();
  const router = useRouter();
  const { confirmer, dialogue } = useConfirmation();
  const [loading, setLoading] = useState(false);
  const suspendu = statutActuel === "suspendu";
  if (statutActuel === "supprime") return null; // la restauration se fait depuis la fiche de la boutique

  async function toggle() {
    const nouveauStatut = suspendu ? "active" : "suspendu";
    const ok = await confirmer(suspendu
      ? { titre: t("Réactiver la boutique « {0} » ?", nomBoutique), message: t("Sa vitrine redevient visible et le marchand peut de nouveau vendre et retirer son argent."), action: t("Réactiver la boutique") }
      : { titre: t("Suspendre la boutique « {0} » ?", nomBoutique), message: t("Sa vitrine n'est plus accessible aux clients et ses retraits sont bloqués jusqu'à la réactivation."), action: t("Suspendre la boutique"), danger: true });
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/statut`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: nouveauStatut }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      toast.success(nouveauStatut === "suspendu" ? t("Boutique « {0} » suspendue.", nomBoutique) : t("Boutique « {0} » réactivée.", nomBoutique));
      router.refresh();
    } catch (e: any) {
      toast.error(t(e.message || "Le changement de statut n'a pas abouti. Réessayez."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={toggle} disabled={loading} className={`cc-btn cc-btn-sm ${suspendu ? "cc-good" : "cc-bad"}`} aria-label={suspendu ? t("Réactiver la boutique « {0} »", nomBoutique) : t("Suspendre la boutique « {0} »", nomBoutique)}>
        {loading ? <Loader2 size={12} className="animate-spin" /> : suspendu ? <CheckCircle2 size={12} /> : <Ban size={12} />}
        {suspendu ? t("Réactiver") : t("Suspendre")}
      </button>
      {dialogue}
    </>
  );
}
