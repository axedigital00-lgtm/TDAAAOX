// Outils gratuits pour entrepreneurs : calculateurs et générateur, utilisables sans compte.
import type { Metadata } from "next";
import { PageAxm, HeroPage, Section, AppelFinal } from "@/components/marketing/site/Blocs";
import { OutilsGratuits } from "@/components/marketing/OutilsGratuits";
import { getT } from "@/lib/i18n/serveur";

export const metadata: Metadata = { title: "Outils gratuits · AXSO", description: "Calculez votre prix de vente et votre seuil de rentabilité, trouvez un nom de boutique. Gratuit, sans inscription." };

export default async function OutilsPage() {
  const t = await getT();
  return (
    <PageAxm>
      <HeroPage
        surtitre={t("Outils gratuits")}
        titre={t("Les bons chiffres avant de vendre.")}
        lead={t("Des outils simples pour fixer vos prix, connaître votre seuil de rentabilité et trouver un nom. Gratuits, sans inscription, rien n'est enregistré.")}
      />
      <Section clair>
        <OutilsGratuits />
      </Section>
      <AppelFinal
        titre={t("Prêt à lancer votre boutique ?")}
        lead={t("Créez votre boutique gratuitement et vendez dès aujourd'hui.")}
        principal={{ label: t("Démarrer gratuitement"), href: "/inscription" }}
        secondaire={{ label: t("Voir les fonctionnalités"), href: "/fonctionnalites" }}
      />
    </PageAxm>
  );
}
