// Communauté : espace d'entraide entre marchands (à venir).
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/serveur";
import { PageAxm, HeroPage, Section, CartesLiens } from "@/components/marketing/site/Blocs";

export const metadata: Metadata = {
  title: "Communauté",
  description: "La communauté des entrepreneurs africains qui vendent en ligne avec AXSO.",
};

export default async function CommunityPage() {
  const t = await getT();
  return (
    <PageAxm>
      <HeroPage surtitre={t("Communauté")} titre={t("Des commerçants qui grandissent ensemble")}
        lead={t("Un espace d'entraide entre marchands AXSO : stratégies, questions et retours d'expérience. Les espaces communauté arrivent bientôt.")}
        principal={{ label: t("Nous contacter"), href: "/contact" }} />
      <Section serre titre={t("En attendant")}>
        <CartesLiens items={[
          { titre: "WhatsApp", texte: t("Posez vos questions à notre équipe sur WhatsApp."), href: "https://wa.me/237698677355", lien: t("Envoyer un message"), externe: true },
          { titre: t("Témoignages"), texte: t("Découvrez l’expérience des marchands qui vendent avec AXSO."), href: "/temoignages", lien: t("Lire les avis") },
          { titre: t("Blog"), texte: t("Nos conseils pour vendre en ligne en Afrique."), href: "/blog", lien: t("Voir les sujets") },
        ]} />
      </Section>
    </PageAxm>
  );
}
