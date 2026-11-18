"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/I18nProvider";

export function CopierLien({ url }: { url: string }) {
  const t = useT();
  const [copie, setCopie] = useState(false);
  async function copier() {
    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      toast.success(t("Adresse de ta boutique copiée."));
      setTimeout(() => setCopie(false), 2000);
    } catch {
      toast.error(t("Copie impossible : sélectionne l'adresse et copie-la à la main."));
    }
  }
  return (
    <button type="button" onClick={copier} aria-label={t("Copier l'adresse de ma boutique")}
      className="flex items-center gap-1.5 text-[12px] font-medium border border-white/20 rounded-2xl px-3.5 py-2 bg-white/10 text-white hover:bg-white/15 transition-colors">
      {copie ? <Check size={13} /> : <Copy size={13} />}{" "}{copie ? t("Copiée") : t("Copier")}
    </button>
  );
}
