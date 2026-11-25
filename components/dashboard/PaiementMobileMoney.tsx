"use client";
// Paiement Mobile Money aux couleurs d'AXSO : un premier toucher ouvre le champ du numéro, le second
// lance la demande ; le marchand valide ensuite sur son téléphone avec son code secret.
import { useState } from "react";
import { Loader2, Smartphone } from "lucide-react";
import { useT } from "@/components/I18nProvider";

export function PaiementMobileMoney({ libelle, onPayer, telephoneDefaut = "", sombre = true }: {
  libelle: string; onPayer: (telephone: string) => Promise<void>; telephoneDefaut?: string; sombre?: boolean;
}) {
  const t = useT();
  const [ouvert, setOuvert] = useState(false);
  const [telephone, setTelephone] = useState(telephoneDefaut);
  const [envoi, setEnvoi] = useState(false);
  const bouton = `w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-70 ${sombre ? "text-white bg-[#0A1A33] hover:bg-[#13284a]" : "text-[#0A1A33] bg-white border border-[#E5E7EB] hover:bg-gray-50"}`;
  if (!ouvert) return <button type="button" onClick={() => setOuvert(true)} className={bouton}><Smartphone size={15} />{t(libelle)}</button>;
  const payer = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnvoi(true);
    try { await onPayer(telephone); } finally { setEnvoi(false); }
  };
  return (
    <form onSubmit={payer} className="space-y-2">
      <input type="tel" inputMode="tel" autoComplete="tel" autoFocus required value={telephone} onChange={(e) => setTelephone(e.target.value)}
        placeholder={t("Numéro Mobile Money, ex. 237 6XX XX XX XX")} aria-label={t("Numéro Mobile Money")}
        className="w-full rounded-xl border border-[#E5E7EB] px-3.5 py-2.5 text-[16px] outline-none focus:border-[#0A1A33]" />
      <button type="submit" disabled={envoi} className={bouton}>
        {envoi && <Loader2 size={14} className="animate-spin" />}
        {envoi ? t("Envoi de la demande…") : t("Recevoir la demande de paiement")}
      </button>
      <p className="text-[11.5px] text-gray-500 leading-snug">{t("Vous validerez sur ce téléphone avec votre code secret Mobile Money.")}</p>
    </form>
  );
}
