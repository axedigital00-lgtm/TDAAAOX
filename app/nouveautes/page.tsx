import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/serveur";
import { HeroPage, PageAxm, Section } from "@/components/marketing/site/Blocs";

export const metadata: Metadata = { title: "Les nouveautés AXSO", description: "Découvrez les outils de création, de suivi et de gestion disponibles sur AXSO." };

const articles = [
  ["Stella", "Préparez une fiche produit avec votre assistante de commerce.", "/fonctionnalites/stella", "/editorial/fiche.webp"],
  ["Le suivi des commandes", "Retrouvez les étapes du trajet de votre colis.", "/suivi", "/editorial/suivi-course.webp"],
  ["Les vitrines AXSO", "Explorez les thèmes et choisissez la mise en page de votre boutique.", "/themes", "/theme-ignite.webp"],
];

export default async function Nouveautes() {
  const t = await getT();
  return <PageAxm><HeroPage centre surtitre={t("Nouveautés")} titre={t("À découvrir sur AXSO")}
    lead={t("Des outils à explorer pour préparer une collection, accompagner une vente et suivre sa livraison.")} />
    <Section serre><div className="axm-editions">{articles.map(([titre, texte, href, photo]) =>
      <Link key={href} href={href} className="axm-edition"><img src={photo} alt="" loading="lazy" /><div><h2 className="axm-h3">{t(titre)} ↗</h2><p>{t(texte)}</p></div></Link>
    )}</div></Section></PageAxm>;
}

