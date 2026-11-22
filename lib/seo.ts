// Référencement des pages publiques : un titre, une description et une adresse canonique par page.
import type { Metadata } from "next";

export const SITE_SEO = "https://www.axsoafrica.com";

export const PAGES_SEO: Record<string, { titre: string; description: string }> = {
  "/": { titre: "Créer une boutique en ligne en Afrique gratuitement | AXSO", description: "AXSO, la plateforme e-commerce pour vendre en ligne en Afrique : boutique, WhatsApp, caisse, paiement à la livraison et suivi des colis. Gratuit pour démarrer." },
  "/tarifs": { titre: "Tarifs AXSO : boutique en ligne gratuite, Pro ou Illimité", description: "Comparez les forfaits AXSO en FCFA. Commencez gratuitement votre boutique en ligne, puis passez au Pro ou à l'Illimité quand votre commerce grandit." },
  "/themes": { titre: "Thèmes de boutique en ligne prêts à vendre | AXSO", description: "Choisissez un thème e-commerce adapté au mobile, personnalisez vos pages et lancez votre boutique en ligne avec AXSO, sans écrire une ligne de code." },
  "/blog": { titre: "Blog e-commerce Afrique : conseils pour vendre | AXSO", description: "Stratégie, livraison, paiement, WhatsApp et IA : des conseils concrets pour lancer et développer votre commerce en ligne en Afrique avec AXSO." },
  "/docs": { titre: "Documentation AXSO : créer et gérer sa boutique en ligne", description: "Guides pas à pas pour créer votre boutique, ajouter vos produits, configurer WhatsApp, gérer la livraison et suivre vos commandes sur AXSO." },
  "/entreprises": { titre: "Plateforme e-commerce pour entreprises en Afrique | AXSO", description: "Équipes, magasins, entrepôts, vente aux professionnels et finance : AXSO réunit les opérations commerciales des entreprises africaines en un seul outil." },
  "/about": { titre: "À propos d'AXSO, le commerce en ligne pensé pour l'Afrique", description: "AXSO aide les entrepreneurs africains à vendre en ligne, sur WhatsApp et en magasin, avec une seule plateforme pensée pour leur façon de commercer." },
  "/contact": { titre: "Contacter AXSO : support, partenariats et presse", description: "Une question sur votre boutique en ligne, un partenariat ou une demande presse ? Contactez l'équipe AXSO et trouvez la bonne personne pour vous répondre." },
  "/transporteurs": { titre: "Sociétés de livraison et livreurs en Afrique | AXSO", description: "Découvrez les transporteurs du réseau AXSO : vérification, zones couvertes et performance. Sociétés et livreurs peuvent aussi rejoindre le réseau." },
  "/temoignages": { titre: "Avis et témoignages de commerçants sur AXSO", description: "Découvrez comment des commerçants utilisent AXSO pour présenter leurs produits, recevoir leurs commandes et organiser leurs livraisons au quotidien." },
  "/affiliation": { titre: "Programme d'affiliation e-commerce en Afrique | AXSO", description: "Recommandez AXSO à des commerçants et touchez une commission sur leurs abonnements. Découvrez le fonctionnement du programme d'affiliation." },
  "/outils": { titre: "Outils gratuits pour e-commerçants en Afrique | AXSO", description: "Calculez vos marges et préparez votre activité avec les outils gratuits d'AXSO, conçus pour les commerçants qui vendent en ligne en Afrique." },
  "/nouveautes": { titre: "Nouveautés AXSO : les dernières fonctions e-commerce", description: "Devis, comptes entreprises, retours, automatisations, lancements : découvrez les dernières fonctionnalités ajoutées à la plateforme e-commerce AXSO." },
  "/migration": { titre: "Migrer sa boutique en ligne vers AXSO, étape par étape", description: "Changez de plateforme e-commerce sans repartir de zéro : la méthode pour transférer vos produits, vos clients et votre activité vers AXSO." },
  "/tutorials": { titre: "Tutoriels e-commerce : lancer sa boutique en ligne | AXSO", description: "Des parcours pas à pas pour créer votre boutique en ligne, publier vos produits, vendre sur WhatsApp et organiser vos livraisons avec AXSO." },
  "/community": { titre: "Communauté de commerçants en ligne africains | AXSO", description: "Retrouvez les ressources et les échanges de la communauté AXSO pour apprendre à vendre en ligne et développer votre commerce en Afrique." },
  "/press": { titre: "Espace presse AXSO : kit média et informations", description: "Présentation, logos et informations utiles pour les journalistes qui souhaitent parler d'AXSO, la plateforme de commerce pensée pour l'Afrique." },
  "/jobs": { titre: "Carrières chez AXSO : construire l'e-commerce africain", description: "Rejoignez AXSO et contribuez à construire les outils qui aident les entrepreneurs africains à vendre en ligne, sur WhatsApp et en magasin." },
  "/inscription": { titre: "Créer ma boutique en ligne gratuitement | AXSO", description: "Ouvrez votre boutique en ligne gratuitement avec AXSO : ajoutez vos produits, partagez votre lien et recevez vos commandes, y compris sur WhatsApp." },
  "/inscription/livreur": { titre: "Devenir livreur ou transporteur partenaire | AXSO", description: "Livreur indépendant ou société de livraison : créez votre compte AXSO, envoyez vos documents et recevez des courses dans vos zones." },
};

export function seoPage(chemin: keyof typeof PAGES_SEO & string): Metadata {
  const p = PAGES_SEO[chemin], url = `${SITE_SEO}${chemin === "/" ? "/" : chemin}`;
  return {
    title: { absolute: p.titre },
    description: p.description,
    alternates: { canonical: url },
    openGraph: { title: p.titre, description: p.description, url, type: "website", siteName: "AXSO", locale: "fr_FR" },
    twitter: { card: "summary_large_image", title: p.titre, description: p.description },
  };
}

/** Données structurées de l'accueil. Les prix sont ceux des forfaits réellement vendus. */
export const donneesStructurees = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${SITE_SEO}/#organisation`, name: "AXSO", url: `${SITE_SEO}/`, logo: `${SITE_SEO}/icon.png` },
    { "@type": "WebSite", "@id": `${SITE_SEO}/#site`, name: "AXSO", url: `${SITE_SEO}/`, inLanguage: "fr", publisher: { "@id": `${SITE_SEO}/#organisation` } },
    {
      "@type": "SoftwareApplication", name: "AXSO", url: `${SITE_SEO}/`, applicationCategory: "BusinessApplication", applicationSubCategory: "E-commerce", operatingSystem: "Web",
      description: PAGES_SEO["/"].description, publisher: { "@id": `${SITE_SEO}/#organisation` },
      offers: [["Essentiel", "0"], ["Pro", "6000"], ["Illimité", "20000"]].map(([name, price]) => ({ "@type": "Offer", name, price, priceCurrency: "XAF" })),
    },
  ],
};
