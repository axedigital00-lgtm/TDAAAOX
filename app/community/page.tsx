// Communauté : entraide entre marchands. L'espace dédié n'est pas encore ouvert.
import type { Metadata } from "next";
import { AppelFinal, CartesLiens, HeroPage, PageAxm, Section } from "@/components/marketing/site/Blocs";
import { Recits } from "@/components/marketing/motion/Sections";
import { getT } from "@/lib/i18n/serveur";

export const metadata: Metadata = { title: "Communauté", description: "Les ressources et l'entraide pour les entrepreneurs africains qui vendent avec AXSO." };

export default async function CommunityPage() {
  const t = await getT();
  return <PageAxm>
    <HeroPage surtitre={t("Communauté")} titre={t("On va plus loin ensemble.")} lead={t("Stratégies, retours d'expérience et entraide entre commerçants. L'espace communautaire arrive bientôt ; en attendant, tout est déjà là pour vous aider.")} principal={{ label: t("Poser une question"), href: "https://wa.me/237698677355" }} secondaire={{ label: t("Lire le blog"), href: "/blog" }} />
    <Section serre titre={t("Disponible dès aujourd'hui")}>
      <CartesLiens items={[
        { titre: "WhatsApp", texte: t("Posez vos questions directement à notre équipe."), href: "https://wa.me/237698677355", lien: t("Écrire sur WhatsApp"), externe: true },
        { titre: t("Documentation"), texte: t("Des guides pas à pas pour chaque module."), href: "/docs", lien: t("Ouvrir les guides") },
        { titre: t("Tutoriels"), texte: t("Des parcours du débutant à l'avancé."), href: "/tutorials", lien: t("Suivre un parcours") },
        { titre: t("Blog"), texte: t("Des méthodes pour vendre mieux."), href: "/blog", lien: t("Lire les articles") },
        { titre: t("Outils gratuits"), texte: t("Prix de vente, rentabilité, nom de boutique."), href: "/outils", lien: t("Utiliser les outils") },
        { titre: t("Témoignages"), texte: t("L'expérience des marchands AXSO."), href: "/temoignages", lien: t("Les découvrir") },
      ]} />
    </Section>
    <Recits t={t} items={[
      { photo: "/visuels/recit-community-1.webp", titre: "Ce que préparera l'espace communauté.", texte: "Un lieu pour apprendre des commerçants qui vivent les mêmes réalités que vous.", scene: "whatsapp", points: ["Discussions par métier et par pays", "Partage de fournisseurs et de bonnes pratiques", "Questions-réponses avec l'équipe", "Retours sur les prochaines fonctionnalités"] },
      { photo: "/visuels/recit-community-2.webp", titre: "Vous créez déjà une communauté ?", texte: "AXSO a les outils pour animer la vôtre autour de vos formations.", scene: "stella", lien: ["Découvrir les formations", "/fonctionnalites/formations"], points: ["Espaces de discussion pour vos élèves", "Sessions en direct", "Bootcamps et missions", "Mentorat"] },
    ]} />
    <AppelFinal titre={t("Une question, une idée ?")} principal={{ label: t("Nous contacter"), href: "/contact" }} secondaire={{ label: t("Démarrer gratuitement"), href: "/inscription" }} />
  </PageAxm>;
}
