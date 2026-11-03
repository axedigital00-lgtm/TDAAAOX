"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useT } from "@/components/I18nProvider";

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
  const [loading, setLoading] = useState(false);

  if (planId !== "palier0") {
    return (
      <p className="w-full py-2.5 rounded-xl text-sm font-semibold text-center text-gray-500 bg-gray-50 border border-gray-200">
        {t("Paiement en ligne bientôt disponible")}
      </p>
    );
  }

  if (planActuel === "palier0") {
    return (
      <button
        disabled
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-400 bg-gray-100 border border-gray-200 cursor-default"
      >
        {t("Plan actuel")}
      </button>
    );
  }

  async function retrograder() {
    if (!window.confirm(t("Toutes tes boutiques repasseront en Essentiel et les jours payés restants seront perdus. Continuer ?"))) return;
    setLoading(true);
    try {
      const res = await fetch("/api/abonnement/changer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: planId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
      toast.success(t("Plan Essentiel activé"));
      router.refresh();
    } catch (err: any) {
      toast.error(t(err.message) ?? t("Erreur lors du changement de plan"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={retrograder}
      disabled={loading}
      className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-70"
      style={{ backgroundColor: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb" }}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {loading ? t("Changement...") : t("Rétrograder")}
    </button>
  );
}
