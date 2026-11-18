import Link from "next/link";
import { Rocket, ArrowRight } from "lucide-react";
import { getT } from "@/lib/i18n/serveur";
import { classesBouton } from "@/components/ui";

// Incite les marchands sans programme d'affiliation actif à en créer un —
// c'est ce qui alimente le marketplace public /affiliation en produits
// promouvables. Sans ça, le marketplace reste vide de contenu.
export async function AffiliationIncitationBanner() {
  const t = await getT();
  return (
    <Link href="/dashboard/affiliation"
      className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5 rounded-carte border border-attention-bordure bg-primaire-fond transition-colors hover:border-primaire">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-controle flex items-center justify-center flex-shrink-0 bg-attention-fond" aria-hidden>
          <Rocket className="size-4 text-attention" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="ax-libelle font-bold">{t("Faites vendre vos produits par d'autres — gratuitement")}</p>
          <p className="ax-aide">
            {t("Activez votre programme d'affiliation : vos produits apparaissent sur le marketplace AXSO, des affiliés les recommandent, vous ne payez qu'à la vente.")}
          </p>
        </div>
      </div>
      <span className={classesBouton({ variante: "primaire", taille: "compact", className: "flex-shrink-0" })}>
        {t("Activer l'affiliation")}<ArrowRight className="size-3.5" aria-hidden />
      </span>
    </Link>
  );
}
