// Blog : articles annoncés (pas encore publiés).
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/serveur";
import { PageAxm, HeroPage, Section, GrilleAVenir, AppelFinal } from "@/components/marketing/site/Blocs";

export const metadata: Metadata = {
  title: "Blog",
  description: "Le blog AXSO : conseils pour les entrepreneurs e-commerce africains. Premiers articles bientôt disponibles.",
};

const ARTICLES = [
  { tag: "Stratégie", titre: "Comment lancer une boutique rentable en Afrique en 2026" },
  { tag: "Mobile Money", titre: "Orange Money, MTN MoMo : bien accepter le Mobile Money à la livraison" },
  { tag: "IA", titre: "Stella : comment l’intelligence artificielle aide à vendre plus" },
  { tag: "Livraison", titre: "Livraison en Afrique subsaharienne : les vrais défis et comment les dépasser" },
  { tag: "Marketing", titre: "Dropshipping en Afrique : fournisseurs, marges et pièges à éviter" },
  { tag: "Tutoriel", titre: "Configurer WhatsApp Business avec AXSO en 10 minutes" },
];

export default async function BlogPage() {
  const t = await getT();
  return (
    <PageAxm>
      <HeroPage surtitre={t("Blog AXSO")} titre={t("Conseils pour vendre en ligne en Afrique")}
        lead={t("Nous préparons nos premiers articles sur la vente en ligne en Afrique. Voici les sujets à paraître.")} />
      <Section serre><GrilleAVenir etiquette={t("À paraître")} items={ARTICLES.map((a) => ({ tag: t(a.tag), titre: t(a.titre) }))} /></Section>
      <AppelFinal titre={t("Une question en attendant ?")} principal={{ label: t("Écrivez-nous"), href: "/contact" }} secondaire={{ label: t("Voir les tutoriels"), href: "/tutorials" }} />
    </PageAxm>
  );
}
