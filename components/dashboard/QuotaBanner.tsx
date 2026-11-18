import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useT } from "@/components/I18nProvider";
import { classesBouton } from "@/components/ui";

export function QuotaBanner() {
  const t = useT();
  return (
    <Link href="/dashboard/abonnement" role="alert"
      className="flex flex-wrap items-center gap-3 px-4 py-3 mb-4 rounded-carte border border-erreur-bordure bg-erreur-fond transition-all hover:brightness-[0.98]">
      <div className="w-10 h-10 rounded-controle flex items-center justify-center flex-shrink-0 bg-carte" aria-hidden>
        <AlertTriangle size={16} className="text-erreur" />
      </div>
      <div className="flex-1 min-w-[12rem]">
        <p className="text-sm font-bold text-erreur">{t("Quota de 60 commandes/mois atteint")}</p>
        <p className="text-sm text-encre/80 leading-snug">
          {t("Vous ne pouvez plus gérer vos commandes ni utiliser WhatsApp ce mois-ci — passez à un palier supérieur pour continuer sans interruption.")}
        </p>
      </div>
      <span className={classesBouton({ variante: "danger-plein", taille: "compact", className: "shrink-0" })}>
        {t("Voir les abonnements")}
      </span>
    </Link>
  );
}
