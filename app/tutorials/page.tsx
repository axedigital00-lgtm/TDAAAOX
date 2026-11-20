// Tutoriels vidéo : sujets prévus (vidéos en cours de tournage).
import type { Metadata } from "next";
import { getT } from "@/lib/i18n/serveur";
import { PageAxm, HeroPage, Section, GrilleAVenir, AppelFinal } from "@/components/marketing/site/Blocs";

export const metadata: Metadata = {
  title: "Tutoriels vidéo",
  description: "Tutoriels vidéo AXSO pas à pas (en préparation).",
};

const TUTOS = [
  { niveau: "Débutant", titre: "Créer sa boutique en 3 minutes" },
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
        lead={t("Nos tutoriels vidéo sont en cours de tournage. Voici les sujets prévus.")} />
      <Section serre><GrilleAVenir image etiquette={t("Bientôt")} items={TUTOS.map((v) => ({ tag: t(v.niveau), titre: t(v.titre) }))} /></Section>
      <AppelFinal titre={t("Besoin d’aide pour démarrer ?")} principal={{ label: t("Nous contacter"), href: "/contact" }} secondaire={{ label: t("Lire la documentation"), href: "/docs" }} />
    </PageAxm>
  );
}
