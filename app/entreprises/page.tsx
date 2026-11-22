import { seoPage } from "@/lib/seo";
import type { Metadata } from "next";
import { AppelFinal, Faq, HeroPage, PageAxm } from "@/components/marketing/site/Blocs";
import { Etapes, Recits } from "@/components/marketing/motion/Sections";
import { getT } from "@/lib/i18n/serveur";

export const metadata: Metadata = seoPage("/entreprises");

export default async function Entreprises() {
  const t = await getT();
  return <PageAxm>
    <HeroPage surtitre={t("Entreprises")} titre={t("Un commerce. Toute une équipe.")} lead={t("Au comptoir, à l'entrepôt, sur la route et à la direction : chacun travaille sur les mêmes données, avec les droits que vous lui donnez.")}
      principal={{ label: t("Parler de mon projet"), href: "/contact" }} secondaire={{ label: t("Voir les forfaits"), href: "/tarifs" }} image={{ src: "/visuels/entreprises.webp", alt: t("Contrôle des colis dans un centre de distribution") }} />
    <Recits t={t} items={[
      { photo: "/visuels/recit-entreprises-1.webp", titre: "La direction voit tout, en direct.", texte: "Plus besoin d'attendre la fin du mois pour savoir où vous en êtes.", scene: "analyses", lien: ["Découvrir la finance", "/fonctionnalites/finance"], points: ["Ventes en ligne et en magasin réunies", "Bénéfice brut, bénéfice net et rentabilité par produit", "Pilotage et supervision des caisses en direct", "Objectifs suivis en temps réel", "Stella résume ce qui demande votre attention"] },
      { photo: "/visuels/recit-entreprises-2.webp", titre: "Vos magasins tournent, même sans réseau.", texte: "Une caisse complète, pensée pour la réalité du terrain.", scene: "caisse", lien: ["Découvrir la caisse", "/fonctionnalites/caisse"], points: ["Plusieurs magasins et plusieurs caisses", "Vente hors ligne, synchronisée au retour du réseau", "Sessions, mouvements d'espèces et rapprochement", "Fidélité, crédit client, retours et avoirs", "Journal d'audit de chaque action sensible"] },
      { photo: "/visuels/recit-entreprises-3.webp", titre: "Votre logistique ne perd plus rien.", texte: "De la réception fournisseur jusqu'à la remise au client.", scene: "stock", lien: ["Découvrir le stock", "/fonctionnalites/stock"], points: ["Plusieurs entrepôts et transferts", "Bons de commande et réceptions partielles", "Lots, numéros de série et inventaires", "Livreurs, transporteurs et suivi de course", "Code de remise à quatre chiffres"] },
      { photo: "/visuels/recit-entreprises-4.webp", titre: "Vos clients pros sont traités comme tels.", texte: "Devis, conditions négociées et portail de commande privé.", scene: "gros", lien: ["Découvrir les devis", "/fonctionnalites/devis-entreprises"], points: ["Comptes entreprises avec identifiant fiscal", "Paiement à 15, 30 ou 60 jours", "Plafond de crédit et encours", "Prix dégressifs et remises négociées", "Numéro de bon de commande sur chaque vente"] },
      { photo: "/visuels/recit-entreprises-5.webp", titre: "Chacun accède à ce qu'il doit voir.", texte: "Un contrôle précis, appliqué côté serveur et non simplement masqué à l'écran.", scene: "compte", lien: ["Découvrir les permissions", "/fonctionnalites/equipe"], points: ["Neuf modules à autoriser un par un", "Aucun accès, lecture ou écriture", "Invitations par e-mail", "Connexions IA limitées et révocables", "Trace des actions importantes"] },
    ]} />
    <Etapes t={t} titre="Comment nous démarrons ensemble" items={[["Parlons de votre organisation", "Vos magasins, vos équipes, vos volumes et vos outils actuels."], ["Préparez votre reprise", "Catalogue, stock, clients et droits de chaque collaborateur."], ["Ouvrez progressivement", "Un magasin ou un canal d'abord, puis le reste."]]} />
    <div className="axm-wrap"><Faq titre={t("Questions des équipes")} items={[
      { q: t("Peut-on gérer plusieurs magasins ?"), r: t("Oui, avec un stock et des analyses par lieu, et une vue d'ensemble.") },
      { q: t("Un caissier peut-il accéder aux finances ?"), r: t("Non, sauf si vous lui ouvrez ce module.") },
      { q: t("Peut-on vendre à crédit à des entreprises ?"), r: t("Oui, avec des conditions de paiement et un plafond par compte.") },
      { q: t("Nos données restent-elles séparées ?"), r: t("Oui, chaque boutique ne voit que ses propres données.") },
    ]} /></div>
    <AppelFinal titre={t("Construisons votre organisation sur AXSO")} principal={{ href: "/contact", label: t("Parler de mon projet") }} secondaire={{ href: "/tarifs", label: t("Comparer les forfaits") }} />
  </PageAxm>;
}
