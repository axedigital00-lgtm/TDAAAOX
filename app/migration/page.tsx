import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n/serveur";
import { AppelFinal, HeroPage, PageAxm, Section } from "@/components/marketing/site/Blocs";

export const metadata: Metadata = { title: "Passer à AXSO", description: "Préparez le transfert de votre catalogue et la mise en ligne de votre vitrine AXSO." };

export default async function Migration() {
  const t = await getT();
  const etapes = [
    ["Préparez votre catalogue", "Exportez les articles de votre ancienne boutique. Vérifiez les noms, les prix et les quantités avant de préparer votre fichier d’import.", "/docs", "Lire la documentation"],
    ["Recomposez votre vitrine", "Choisissez un thème, vérifiez les photos et les variantes de chaque fiche, puis parcourez votre boutique sur téléphone.", "/themes", "Découvrir les thèmes"],
    ["Vérifiez le parcours de commande", "Testez le panier, la destination et le mode de paiement avant de partager la nouvelle adresse avec vos clients.", "/fonctionnalites/paiements", "Découvrir les paiements"],
  ];
  return <PageAxm><HeroPage surtitre={t("Passer à AXSO")} titre={t("Votre prochain chapitre commence avec votre catalogue.")}
    lead={t("Reprenez vos articles, préparez votre vitrine et vérifiez votre première commande avant l’ouverture.")}
    principal={{ href: "/inscription", label: t("Créer ma boutique") }}
    secondaire={{ href: "#transfert", label: t("Préparer le transfert") }}
    image={{ src: "/editorial/mediatheque.webp", alt: t("Un espace de travail pour préparer les visuels du catalogue") }} />
    <Section serre id="transfert"><ol className="axm-migration-steps">{etapes.map(([titre, description, href, action], i) =>
      <li key={href}><span aria-hidden>0{i + 1}</span><div><h2 className="axm-h3">{t(titre)}</h2><p className="axm-lead">{t(description)}</p><Link href={href} className="axm-link">{t(action)} →</Link></div></li>
    )}</ol></Section>
    <AppelFinal titre={t("Besoin d’aide pour démarrer ?")} principal={{ href: "/contact", label: t("Nous contacter") }} />
  </PageAxm>;
}

