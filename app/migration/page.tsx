import type { Metadata } from "next";
import { AppelFinal, Faq, HeroPage, PageAxm } from "@/components/marketing/site/Blocs";
import { Etapes, Recits } from "@/components/marketing/motion/Sections";
import { getT } from "@/lib/i18n/serveur";

export const metadata: Metadata = { title: "Passer à AXSO", description: "La méthode complète pour transférer votre catalogue, votre vitrine et votre adresse vers AXSO sans interrompre vos ventes." };

export default async function Migration() {
  const t = await getT();
  return <PageAxm>
    <HeroPage surtitre={t("Passer à AXSO")} titre={t("Changez de plateforme sans perdre une seule vente.")} lead={t("Préparez tout en coulisses. Votre ancienne boutique continue de vendre jusqu'au jour où vous décidez de basculer.")}
      principal={{ href: "/inscription", label: t("Créer ma boutique") }} secondaire={{ href: "#transfert", label: t("Voir la méthode") }} image={{ src: "/visuels/migration.webp", alt: t("Transfert des épreuves photographiques du catalogue") }} />
    <div id="transfert" />
    <Etapes t={t} titre="La méthode en six temps" items={[["Faites l'inventaire", "Produits, variantes, stock, clients, pages, promotions en cours."], ["Exportez vos données", "Récupérez vos fichiers depuis votre plateforme actuelle."], ["Importez sur AXSO", "L'import magique prépare vos fiches, vous vérifiez."], ["Recomposez la vitrine", "Choisissez un thème et reprenez vos textes et images."], ["Testez le parcours", "Passez une vraie commande : panier, zone, paiement, suivi."], ["Basculez votre adresse", "Connectez votre domaine quand tout est prêt."]]} />
    <Recits t={t} items={[
      { photo: "/visuels/recit-migration-1.webp", titre: "Votre catalogue d'abord.", texte: "C'est le cœur de votre boutique, et la partie à vérifier avec le plus de soin.", scene: "catalogue", lien: ["Découvrir l'import magique", "/fonctionnalites/import-magique"], points: ["Noms, descriptions et photos", "Prix, prix barrés et coûts", "Variantes et stock par article", "Catégories et collections", "Titres et descriptions pour Google"] },
      { photo: "/visuels/recit-migration-2.webp", titre: "Votre vitrine, en mieux.", texte: "Le brouillon vous laisse le temps de bien faire, sans rien montrer.", scene: "vitrine", lien: ["Découvrir les thèmes", "/fonctionnalites/themes-constructeur"], points: ["Thème adapté à votre univers", "Accueil, à propos et contact", "Navigation et pied de page", "Vérification sur téléphone"] },
      { photo: "/visuels/recit-migration-3.webp", titre: "Votre adresse, au bon moment.", texte: "La bascule se fait quand vous êtes prêt, avec votre domaine actuel.", scene: "domaine", lien: ["Lire le guide des domaines", "/docs/personnaliser-domaine"], points: ["Baissez le TTL DNS quelques jours avant", "Créez les enregistrements affichés par AXSO", "Vérifiez le HTTPS", "Gardez l'ancienne boutique active quelques jours", "Prévenez vos clients sur WhatsApp"] },
    ]} />
    <div className="axm-wrap"><Faq titre={t("Questions sur le transfert")} items={[
      { q: t("Ma boutique actuelle s'arrête-t-elle pendant la préparation ?"), r: t("Non, elle continue jusqu'à ce que vous changiez votre domaine.") },
      { q: t("Puis-je garder mon nom de domaine ?"), r: t("Oui, il suffit de le connecter à AXSO.") },
      { q: t("Puis-je me faire aider ?"), r: t("Oui, écrivez-nous en décrivant votre boutique actuelle.") },
    ]} /></div>
    <AppelFinal titre={t("Besoin d’aide pour démarrer ?")} principal={{ href: "/contact", label: t("Nous contacter") }} secondaire={{ href: "/inscription", label: t("Créer ma boutique") }} />
  </PageAxm>;
}
