"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { PaiementMobileMoney } from "@/components/dashboard/PaiementMobileMoney";

interface AbonnementActionsProps {
  planId: string;
  planActuel: string;
  couleur: string;
}

// Paliers payants : paiement Mobile Money direct, validé sur le téléphone du marchand.
export default function AbonnementActions({ planId, planActuel }: AbonnementActionsProps) {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (planId !== "palier0") {
    const payer = async (telephone: string) => {
      try {
        const res = await fetch("/api/abonnement/payer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: planId, telephone }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.id) throw new Error(data.error ?? "Paiement indisponible");
        router.push(`/dashboard/abonnement/retour?id=${encodeURIComponent(data.id)}`);
      } catch (err: any) {
        toast.error(t(err.message));
      }
    };
    return <PaiementMobileMoney libelle={planActuel === planId ? "Renouveler avec Mobile Money" : "Payer avec Mobile Money"} onPayer={payer} />;
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
