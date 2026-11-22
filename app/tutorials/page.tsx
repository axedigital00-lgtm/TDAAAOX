// Tutoriels vidéo : sujets prévus (vidéos en cours de tournage).
import type { Metadata } from "next";
import { FilmBoutique } from "@/components/marketing/VideoSection";
import "@/components/marketing/home/editorial.css";
import { getT } from "@/lib/i18n/serveur";
import { PageAxm, HeroPage, Section, GrilleAVenir, AppelFinal } from "@/components/marketing/site/Blocs";

export const metadata: Metadata = {
  title: "Tutoriels vidéo",
  description: "Regardez la présentation AXSO et découvrez les prochains tutoriels.",
};

const TUTOS = [
  { niveau: "Débutant", titre: "Encaisser à la livraison et par Mobile Money" },
  { niveau: "Débutant", titre: "Ajouter et gérer ses produits" },
  { niveau: "Intermédiaire", titre: "Stella : bien démarrer avec l’assistante" },
  { niveau: "Intermédiaire", titre: "Livraison et suivi des commandes" },
  { niveau: "Intermédiaire", titre: "WhatsApp Business : configuration" },
  { niveau: "Avancé", titre: "Analyses et rapports de ventes" },
  { niveau: "Avancé", titre: "Dropshipping en Afrique, de A à Z" },
];

export default async function TutorialsPage() {
  const t = await getT();
  return (
    <PageAxm>
      <HeroPage surtitre={t("Tutoriels vidéo")} titre={t("Apprenez à votre rythme")}
        lead={t("Découvrez la création d’une boutique en trois minutes.")} />
      <Section serre><FilmBoutique /></Section>
      <Section serre titre={t("Prochains tutoriels")}><GrilleAVenir image etiquette={t("Bientôt")} items={TUTOS.map((v) => ({ tag: t(v.niveau), titre: t(v.titre) }))} /></Section>
      <AppelFinal titre={t("Besoin d’aide pour démarrer ?")} principal={{ label: t("Nous contacter"), href: "/contact" }} secondaire={{ label: t("Lire la documentation"), href: "/docs" }} />
    </PageAxm>
  );
}
