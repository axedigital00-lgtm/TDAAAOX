"use client";
import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { useT } from "@/components/I18nProvider";

export function PartagerParrainage({ lien }: { lien: string }) {
  const t = useT();
  const [copie, setCopie] = useState(false);
  const message = t("Je vends avec AXSO : boutique, WhatsApp, caisse et livraison au même endroit. Crée la tienne gratuitement : {0}", lien);
  return <div className="mt-5">
    <p className="rounded-xl bg-white/10 px-3 py-2.5 text-[13px] font-mono break-all">{lien}</p>
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" onClick={async () => { await navigator.clipboard?.writeText(lien); setCopie(true); setTimeout(() => setCopie(false), 1800); }} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-semibold text-black">{copie ? <Check size={15} /> : <Copy size={15} />}{copie ? t("Lien copié") : t("Copier mon lien")}</button>
      <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/30 px-4 text-[13px] font-semibold text-white"><MessageCircle size={15} />{t("Partager sur WhatsApp")}</a>
    </div>
  </div>;
}
