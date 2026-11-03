"use client";
// Rappel de la politique de prix sous le champ prix d'un produit : ce que le client paiera et ce
// que le marchand garde (calcul de lib/pricing.ts, texte complet sur /legal/politique-prix).
import Link from "next/link";
import { Info } from "lucide-react";
import { prixClient, TYPES_NUMERIQUES } from "@/lib/pricing";
import { useDevise } from "@/components/dashboard/DeviseProvider";
import { useT } from "@/components/I18nProvider";

// ponytail: taux de base de toutes les boutiques (Tenant.commissionRate = 0,10) ; le lire de la boutique si un taux négocié apparaît.
const TAUX = 0.1;

export function PolitiquePrix({ prix, type }: { prix: string | number; type: string }) {
  const tr = useT();
  const { fmt } = useDevise();
  const p = Number(prix) || 0;
  const numerique = TYPES_NUMERIQUES.has(type);
  return (
    <div className="flex items-start gap-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3 text-[12px] leading-relaxed text-[#92400E]">
      <Info size={14} className="mt-0.5 flex-shrink-0" />
      <div>
        {numerique ? (
          <p>{p > 0
            ? tr("Vente en ligne momentanément indisponible. À son retour, le client paiera {0} : votre prix + 13 % (10 % AXSO, 3 % frais de paiement). Vous recevrez {1}.", fmt(prixClient(p, TAUX, type)), fmt(p))
            : tr("Produit numérique : vente en ligne momentanément indisponible. À son retour, la plateforme ajoutera 13 % à votre prix (10 % AXSO, 3 % frais de paiement) ; vous garderez votre prix.")}</p>
        ) : (
          <p>{p > 0
            ? tr("Payé à la livraison : le client paie {0}, sans commission. Vous recevez {0}.", fmt(p))
            : tr("Produit physique : payé à la livraison, rien n'est ajouté à votre prix. Vous le gardez en entier.")}</p>
        )}
        <Link href="/legal/politique-prix" target="_blank" className="font-semibold underline">{tr("Politique de prix")}</Link>
      </div>
    </div>
  );
}
