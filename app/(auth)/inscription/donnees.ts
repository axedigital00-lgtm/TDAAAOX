// Contenus du parcours d'inscription (questions inchangées depuis l'ancien parcours en discussion).
import { MANIFESTE_LIBRAIRIE, detecterCategorie } from "@/lib/axso-design-manifest";

// Deux types seulement : un catalogue mixte choisit « physique » (le type reste réglable par produit).
export type TypeBoutique = "physique" | "digital";

export const PAYS_LIST = [
  { code: "SN", nom: "Sénégal" },
  { code: "CI", nom: "Côte d'Ivoire" },
  { code: "CM", nom: "Cameroun" },
  { code: "MA", nom: "Maroc" },
  { code: "NG", nom: "Nigeria" },
  { code: "GH", nom: "Ghana" },
  { code: "TG", nom: "Togo" },
  { code: "BJ", nom: "Bénin" },
  { code: "ML", nom: "Mali" },
  { code: "KE", nom: "Kenya" },
  { code: "CD", nom: "RDC" },
];

// Exemples alignés sur le type choisi : proposer « Mode » à qui vend du digital n'a aucun sens.
export const VENTE_EXEMPLES: Record<TypeBoutique, string[]> = {
  physique: ["Mode & vêtements africains", "Cosmétiques naturels", "Bijoux artisanaux", "Électronique & gadgets", "Alimentation & épices", "Chaussures & maroquinerie"],
  digital: ["Formations en ligne", "Ebooks & guides pratiques", "Templates & designs Canva/Notion", "Musique & beats", "Coaching & consulting", "Logiciels & abonnements SaaS"],
};
export const VENTE_PLACEHOLDER: Record<TypeBoutique, string> = {
  physique: "Ex : des vêtements femme inspirés de la culture africaine, à Dakar…",
  digital: "Ex : des formations en ligne sur le trading et des ebooks business…",
};

/** Pourquoi Axia propose ce design (texte court sous la carte). */
export function raisonTheme(fichier: string, nomBoutique: string, vente: string): string {
  const e = MANIFESTE_LIBRAIRIE.find((x) => x.fichier === fichier);
  if (!e) return "Un design choisi pour ton marché.";
  const map: Record<string, string> = {
    fashion: "s'adapte à l'univers mode",
    jewelry: "met en valeur l'aspect précieux de tes produits",
    beauty: "inspire confiance et soin",
    sport: "reflète l'énergie et la performance",
    tech: "projette une image moderne",
    food: "donne envie d'acheter",
    artisan: "célèbre l'authenticité artisanale",
    home: "crée une atmosphère chaleureuse",
    services: "inspire professionnalisme et expertise",
    agriculture: "valorise le naturel et le terroir",
    general: "s'adapte à toute activité",
  };
  return `Style ${e.ambiance.slice(0, 2).join(" & ")} — ${map[detecterCategorie(vente)] || "idéal pour ta boutique"} ${nomBoutique}.`;
}

/** Aperçu réel du design avec le nom et les produits de la boutique (même URL que l'ancien parcours). */
export function urlApercu(fichier: string, nom: string, devise: string, produits: { nom: string; prix: number; imageUrl?: string }[], digital: boolean) {
  // Jamais d'image data: (des centaines de Ko) : l'URL dépasserait la limite de Vercel (414).
  const p = encodeURIComponent(JSON.stringify(produits.slice(0, 6).map((x) => ({ nom: x.nom, prix: x.prix, image: /^https?:\/\//.test(x.imageUrl ?? "") ? x.imageUrl : "" }))));
  return `/api/preview-theme?fichier=${encodeURIComponent(fichier)}&nom=${encodeURIComponent(nom || "Ma Boutique")}&devise=${encodeURIComponent(devise || "XAF")}&produits=${p}${digital ? "&digital=1" : ""}`;
}

/** Miniature légère du design (~12 Ko), affichée tout de suite. */
export const miniatureTheme = (fichier: string) => `/themes-apercu/cartes/${fichier.replace(/\.html$/, "")}.jpg`;
