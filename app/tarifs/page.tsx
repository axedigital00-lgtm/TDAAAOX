// Tarifs : page dédiée (comme la page des forfaits des grandes plateformes),
// avec les forfaits et la FAQ existants.
import type { Metadata } from "next";
import { TarifsSection } from "@/components/marketing/TarifsSection";
import { FaqSection } from "@/components/marketing/FaqSection";
import { PageAxm, HeroPage, AppelFinal } from "@/components/marketing/site/Blocs";
import { finPromo } from "@/lib/promo";
import { getLangue, getT } from "@/lib/i18n/serveur";
import { AnnuaireModules } from "@/components/marketing/motion/Sections";

export const revalidate = 60;
export const metadata: Metadata = { title: "Tarifs · AXSO", description: "Les forfaits AXSO : commencez gratuitement, passez au Pro quand vous grandissez." };

export default async function TarifsPage() {
  const [t, promo, langue] = await Promise.all([getT(), finPromo(), getLangue()]);
  return (
    <PageAxm>
      <HeroPage
        surtitre={t("Tarifs")}
        titre={t("Commencez gratuitement. Grandissez à votre rythme.")}
        lead={t("Aucune commission AXSO sur vos ventes payées à la livraison. Changez de forfait quand vous voulez.")}
      />
      <TarifsSection promoFinLe={promo?.toISOString() ?? null} maintenant={Date.now()} />
      <AnnuaireModules t={t} langue={langue} titre={t("Ce que vous obtenez avec AXSO.")} />
      <FaqSection />
      <AppelFinal
        titre={t("Votre boutique vous attend")}
        lead={t("Créez votre boutique gratuitement, sans carte bancaire.")}
        principal={{ label: t("Démarrer gratuitement"), href: "/inscription" }}
        secondaire={{ label: t("Nous contacter"), href: "/contact" }}
      />
    </PageAxm>
  );
}
