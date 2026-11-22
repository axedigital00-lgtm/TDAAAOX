import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/serveur";
import { AppelFinal, Faq, HeroPage, PageAxm, Section } from "@/components/marketing/site/Blocs";

export const metadata: Metadata = { title: "AXSO pour les entreprises", description: "Organisez les ventes, le stock et les livraisons de votre équipe sur AXSO." };

export default async function Entreprises() {
  const t = await getT();
  return <PageAxm>
    <HeroPage surtitre={t("Entreprises")} titre={t("Un commerce. Toute une équipe.")}
      lead={t("Au comptoir, à l’entrepôt et sur la route, chacun retrouve les commandes dont il a besoin.")}
      principal={{ label: t("Parler de mon projet"), href: "/contact" }}
      secondaire={{ label: t("Voir les forfaits"), href: "/tarifs" }}
      image={{ src: "/editorial/livraison.webp", alt: t("Préparation d’une livraison") }} />
    <Section serre><Faq titre={t("Comment votre équipe travaille")} items={[
      { q: t("Responsable de boutique"), r: <>{t("Retrouvez les ventes et les visites sur la même période pour préparer votre prochaine opération.")} <Link className="axm-link" href="/fonctionnalites/analyses">{t("Voir les analyses")} →</Link></> },
      { q: t("Équipe de vente"), r: <>{t("Au comptoir, retrouvez vos articles et enregistrez chaque vente dans le stock commun.")} <Link className="axm-link" href="/fonctionnalites/caisse">{t("Découvrir la caisse")} →</Link></> },
      { q: t("Équipe de livraison"), r: <>{t("Assignez les colis et partagez le suivi avec vos clients.")} <Link className="axm-link" href="/fonctionnalites/livraison">{t("Découvrir la livraison")} →</Link></> },
    ]} /></Section>
    <AppelFinal titre={t("Choisissez un forfait pour votre équipe")} principal={{ href: "/tarifs", label: t("Comparer les forfaits") }} />
  </PageAxm>;
}

