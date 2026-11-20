"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {  } from "lucide-react";
import { useT } from "@/components/I18nProvider";

export function MarquerRemisButton({ commandeIds }: { commandeIds: string[] }) {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function marquerRemis() {
    setLoading(true);
    try {
      const res = await fetch("/api/commandes/remise-cod", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commandeIds }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("Encaissement confirmé"));
      router.refresh();
    } catch {
      toast.error(t("Erreur lors de la confirmation"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={marquerRemis} disabled={loading} className="axd-btn axd-btn--primary">
      {loading ? t("Confirmation...") : t("Marquer comme remis")}
    </button>
  );
}
