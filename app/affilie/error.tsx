"use client";
// Erreur dans une page de l'espace affilié : le cadre (menu) reste affiché, on propose de réessayer.
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useT } from "@/components/I18nProvider";

export default function ErreurAffilie({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useT();
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
      <AlertTriangle size={28} className="mx-auto mb-3 text-red-500" />
      <h1 className="text-[17px] font-bold mb-1">{t("Cette page n'a pas pu se charger")}</h1>
      <p className="text-[13px] text-[#777] max-w-sm mx-auto mb-5">
        {t("Vos gains et vos liens ne sont pas perdus. Réessayez dans un instant ; si le problème continue, contactez le support Axso.")}
      </p>
      {error.digest && <p className="text-[11px] text-[#999] font-mono mb-4">#{error.digest}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        <button onClick={() => retry()} className="inline-flex items-center gap-2 px-5 min-h-[44px] rounded-xl bg-[#F5A623] text-[#111] text-[13px] font-bold">
          <RefreshCw size={14} />{t("Réessayer")}
        </button>
        <Link href="/affilie" className="inline-flex items-center px-5 min-h-[44px] rounded-xl border border-gray-200 text-[13px] font-semibold">{t("Retour à l'accueil")}</Link>
      </div>
    </div>
  );
}
