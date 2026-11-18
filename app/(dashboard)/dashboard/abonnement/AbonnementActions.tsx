"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";
import { Bouton, Confirmation } from "@/components/ui";

interface AbonnementActionsProps {
  planId: string;
  planActuel: string;
  couleur: string;
}

// Paliers payants : pas de paiement en ligne pour l'instant (prestataire à venir).
// Seul le retour en Essentiel reste possible ici.
export default function AbonnementActions({ planId, planActuel }: AbonnementActionsProps) {
  const t = useT();
  const router = useRouter();
  const [confirmer, setConfirmer] = useState(false);

  if (planId !== "palier0") {
    return (
      <p className="w-full py-2.5 rounded-controle text-sm font-semibold text-center text-doux bg-carte-2 border border-bordure">
        {t("Paiement en ligne bientôt disponible")}
      </p>
    );
  }

  if (planActuel === "palier0") {
    return <Bouton variante="secondaire" large disabled>{t("Plan actuel")}</Bouton>;
  }

  // Lève en cas d'échec : la fenêtre de confirmation reste ouverte.
  async function retrograder() {
    const res = await fetch("/api/abonnement/changer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: planId }) }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) {
      toast.error(data.error ? t(data.error) : t("Le changement de plan n'a pas abouti. Vérifiez votre connexion et réessayez."));
      throw new Error("changement");
    }
    toast.success(t("Plan Essentiel activé pour toutes vos boutiques."));
    router.refresh();
  }

  return (
    <>
      <Bouton variante="danger" large onClick={() => setConfirmer(true)}>{t("Repasser en Essentiel")}</Bouton>
      <Confirmation ouverte={confirmer} onFermer={() => setConfirmer(false)} onConfirmer={retrograder}
        titre={t("Repasser au plan Essentiel ?")} objet={t("Toutes vos boutiques")}
        description={t("Toutes tes boutiques repasseront en Essentiel et les jours payés restants seront perdus.")}
        libelleConfirmer={t("Repasser en Essentiel")} />
    </>
  );
}
