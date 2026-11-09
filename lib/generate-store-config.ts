import { formatMontant } from "./utils";
import { convertirDepuisXAF } from "./devise-convert";
/**
 * Génère un themeConfig complet et optimisé à partir du profil business du marchand.
 * Chaque boutique créée démarre avec un setup premium calibré pour sa catégorie.
 */
import type { ProductPageSection, CustomSection, ThemeAboutPageConfig, ThemeContactPageConfig } from "./theme-config";

// ─── Détection de catégorie ───────────────────────────────────────────────────
export type CategoryType =
  | "fashion" | "beauty" | "food" | "tech" | "home" | "jewelry"
  | "kids"    | "health" | "sport" | "services" | "agriculture"
  | "artisan" | "books"  | "auto"  | "general";

export function detectCategory(cat: string): CategoryType {
  const c = cat.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  if (/mode|vetement|habit|fashion|lingerie|sac|chaussure|maroquinerie|pret.a.porter|textile|couture/.test(c)) return "fashion";
  if (/beaut|cosmet|soin|maquillage|parfum|coiffure|hair|skin|manucure|esthetique/.test(c)) return "beauty";
  if (/aliment|nourriture|epicerie|food|restaur|cuisine|boisson|snack|patisserie|boulang|epice|cafe|the/.test(c)) return "food";
  if (/electron|tech|informatique|telephone|high.tech|ordinateur|appareil|smartphone|tablette|accessoire.tel/.test(c)) return "tech";
  if (/maison|deco|ameublement|mobilier|salon|chambre|jardin|cuisine.equip|literie|tapis/.test(c)) return "home";
  if (/bijou|joaillerie|montre|bague|collier|bracelet|pendentif|or|argent|diamant/.test(c)) return "jewelry";
  if (/enfant|bebe|jouet|puericulture|scolaire|creche|naissance|maternite/.test(c)) return "kids";
  if (/sante|bien.?etre|pharmacie|medical|para.?pharmacie|vitamine|supplement|clinique|therapeutique/.test(c)) return "health";
  if (/sport|fitness|gym|musculation|running|yoga|natation|football|basket|tennis/.test(c)) return "sport";
  if (/service|coaching|formation|consulting|conseil|agence|prestation|freelance|digital/.test(c)) return "services";
  if (/agricultur|plante|jardin|semence|graine|ferme|bio|maraicher|elevage/.test(c)) return "agriculture";
  if (/artisan|fait.main|handmade|artisanat|poterie|broderie|vannerie|sculpture/.test(c)) return "artisan";
  if (/livre|libraire|culture|art|musique|photo|instrument|galerie/.test(c)) return "books";
  if (/auto|moto|voiture|vehicule|piece|garage|mecanique|pneumatique/.test(c)) return "auto";
  return "general";
}

// ─── Sections page produit par catégorie ────────────────────────────────────
// Seulement de la structure : aucune promesse écrite à la place du marchand
// (matière, certificat, garantie, délai…). Le contenu vient de ses fiches produit.
const TITRES_SIMILAIRES: Partial<Record<CategoryType, string>> = {
  fashion: "Ces pièces vous correspondent", beauty: "Des produits qui complètent votre routine",
  food: "Ces produits vont ensemble", tech: "Ces produits vous intéresseront aussi",
  home: "Ces articles complètent votre décoration", jewelry: "Ces bijoux vous séduiront aussi",
  kids: "D'autres coups de cœur pour vos enfants", health: "Ces produits complètent votre bien-être",
  sport: "Ces équipements améliorent votre performance", agriculture: "Ces produits vont avec vos achats",
  artisan: "D'autres créations artisanales",
};

function buildProductSections(type: CategoryType): ProductPageSection[] {
  const s = (id: string, type: string, config: Record<string, any> = {}): ProductPageSection =>
    ({ id, type: type as any, actif: true, config });
  const desc = s("description", "description", { ai: true });
  const reviews = s("reviews", "reviews");
  if (type === "services") return [s("info", "info", { breadcrumbs: true, badges: true, stock: true }), s("quantity", "quantity"), s("trust", "trust"), desc, reviews];
  return [
    s("gallery", "gallery", { style: "vertical-thumbs", zoom: true, sticky: true }),
    s("info", "info", { breadcrumbs: true, badges: true, stock: true }),
    s("variants", "variants"), s("quantity", "quantity"), s("trust", "trust"),
    desc, reviews,
    ...(type === "fashion" ? [s("social", "social")] : []),
    s("similar", "similar", { count: 4, titre: TITRES_SIMILAIRES[type] ?? "Ces produits vous plairont aussi" }),
  ];
}

// ─── Détection de langue ──────────────────────────────────────────────────────
type Langue = "fr" | "en";

function detectLangue(pays?: string): Langue {
  if (!pays) return "fr";
  const p = pays.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  if (/nigeria|ghana|kenya|uganda|tanzania|zambia|zimbabwe|botswana|namibia|south.?africa|gambia|sierra.?leone|liberia|ethiopia|malawi|rwanda|angola|cameroon/.test(p)) return "en";
  return "fr";
}

// ─── Traductions UI ───────────────────────────────────────────────────────────
const TR: Record<Langue, {
  confiance: { icone: string; titre: string; texte: string }[];
  newsletterTitre: (nom: string) => string;
  newsletterTexte: string;
  newsletterPlaceholder: string;
  newsletterCta: string;
  vedettes: string; collections: string; promo: string;
  faq: string; avis: string;
}> = {
  fr: {
    confiance: [
      { icone: "📦", titre: "Livraison rapide",  texte: "Expédiée sous 24-48h" },
      { icone: "🔒", titre: "Paiement sécurisé", texte: "Orange Money, MTN, carte" },
      { icone: "↩️", titre: "Retours faciles",   texte: "Sous 14 jours" },
      { icone: "💬", titre: "Support 7j/7",       texte: "Réponse en moins d'1h" },
    ],
    newsletterTitre: (nom) => `Rejoignez ${nom}`,
    newsletterTexte: "Recevez nos offres exclusives et nouveautés en avant-première",
    newsletterPlaceholder: "votre@email.com",
    newsletterCta: "Je m'abonne",
    vedettes: "Nos meilleures ventes", collections: "Explorer par catégorie",
    promo: "Offres du moment", faq: "Questions fréquentes",
    avis: "Ce que disent nos clients",
  },
  en: {
    confiance: [
      { icone: "📦", titre: "Fast Delivery",    texte: "Shipped within 24-48h" },
      { icone: "🔒", titre: "Secure Payment",   texte: "Mobile Money, card — 100% secure" },
      { icone: "↩️", titre: "Easy Returns",     texte: "Within 14 days" },
      { icone: "💬", titre: "24/7 Support",     texte: "Response within 1 hour" },
    ],
    newsletterTitre: (nom) => `Join ${nom}`,
    newsletterTexte: "Get our exclusive deals and new arrivals first",
    newsletterPlaceholder: "your@email.com",
    newsletterCta: "Subscribe",
    vedettes: "Best Sellers", collections: "Shop by Category",
    promo: "Current Deals", faq: "Frequently Asked Questions",
    avis: "What Our Customers Say",
  },
};

// ─── Hero content bilingue par catégorie ──────────────────────────────────────
const HERO_EN: Partial<Record<CategoryType, (nom: string) => { titre: string; sousTitre: string; ctaTexte: string; annonce: string }>> = {
  fashion:  (nom) => ({ titre: `${nom} — Your Style, Your Identity`, sousTitre: "Carefully curated pieces to reveal your unique personality", ctaTexte: "Shop the Collection", annonce: `✦ Free delivery over 50$ ✦ -10% on your first order with WELCOME ✦ 14-day returns` }),
  beauty:   (nom) => ({ titre: `${nom} — Natural Beauty Revealed`, sousTitre: "Premium skincare crafted to celebrate your authentic beauty, naturally", ctaTexte: "Shop My Skincare", annonce: `✨ Free shipping over 30$ ✨ 100% natural formulas ✨ Satisfied or refunded` }),
  food:     (nom) => ({ titre: `${nom} — Authentic Flavours`, sousTitre: "Fresh products sourced from local farmers, delivered straight to you", ctaTexte: "Order Now", annonce: `🌿 Fresh products delivered in 24h ✦ 100% natural, no preservatives ✦ Order before 12pm for same-day delivery` }),
  tech:     (nom) => ({ titre: `${nom} — Innovation Within Reach`, sousTitre: "The best tech products at the best price, with authenticity guarantee and reactive support", ctaTexte: "Browse Catalogue", annonce: `🔒 100% genuine products ✦ Express 24h delivery ✦ Responsive support` }),
  jewelry:  (nom) => ({ titre: `${nom} — Wear Your Story`, sousTitre: "Handcrafted jewellery that celebrates your heritage and elegance", ctaTexte: "Discover Collections", annonce: `✦ Free gift wrapping ✦ Authenticity certificate ✦ 30-day returns` }),
  home:     (nom) => ({ titre: `${nom} — Your Interior, Your Signature`, sousTitre: "Furniture and decor carefully selected to create your ideal living space", ctaTexte: "Explore the Store", annonce: `🏠 Home delivery ✦ Assembly included on selection ✦ 30-day satisfaction guarantee` }),
  health:   (nom) => ({ titre: `${nom} — Your Wellbeing First`, sousTitre: "Quality health and wellness products selected by experts for your daily routine", ctaTexte: "Shop Wellness", annonce: `✦ Authentic certified products ✦ Expert advice included ✦ Fast delivery` }),
  services: (nom) => ({ titre: `${nom} — Expertise That Makes the Difference`, sousTitre: "Professional services delivered on time, every time, with results guaranteed", ctaTexte: "View Our Services", annonce: `⚡ Results guaranteed ✦ Secure payment ✦ Start within 48h ✦ Unlimited revisions` }),
  general:  (nom) => ({ titre: `${nom} — Quality, Simply`, sousTitre: "Carefully selected products to satisfy you with every order and unbeatable service", ctaTexte: "Shop Now", annonce: `✦ Fast delivery 24-48h ✦ Secure payment ✦ Satisfaction guaranteed ✦ 7/7 support` }),
};

// ─── Sections homepage par catégorie ──────────────────────────────────────────
function buildHomeSections(type: CategoryType, nom: string, langue: Langue = "fr"): {
  sections: any;
  sectionOrder: string[];
  customSections: any[];
} {
  const nomCourt = nom.split(/[\s-]/)[0]; // premier mot du nom de boutique
  const t = TR[langue];
  const heroEn = HERO_EN[type]?.(nomCourt);

  const base = {
    confiance: {
      actif: true,
      layout: "icons" as const,
      items: t.confiance,
    },
    newsletter: (titre: string, texte: string, style: "centered" | "split" | "banner" = "centered") => ({
      actif: true,
      titre:       langue === "en" ? t.newsletterTitre(nomCourt) : titre,
      texte:       langue === "en" ? t.newsletterTexte            : texte,
      placeholder: t.newsletterPlaceholder,
      ctaTexte:    t.newsletterCta,
      style,
    }),
  };

  const fashionSections = {
    annonce: { actif: true, texte: heroEn?.annonce ?? `✦ Livraison gratuite dès 25 000 XOF ✦ -10% sur votre 1ère commande avec BIENVENUE ✦ Retour 14 jours`, couleurFond: "#111111", couleurTexte: "#F5A623" },
    hero: { actif: true, style: "fullscreen" as const, titre: heroEn?.titre ?? `${nomCourt} — Votre style, votre identité`, sousTitre: heroEn?.sousTitre ?? "Des pièces soigneusement sélectionnées pour révéler votre personnalité unique", ctaTexte: heroEn?.ctaTexte ?? "Découvrir la collection", ctaLien: "produits", overlay: 55, hauteur: "100vh" as const, textPosition: "center" as const, showSecondCta: true, secondCtaTexte: langue === "en" ? "View Collections" : "Voir les collections", secondCtaLien: "collections" },
    confiance: { ...base.confiance },
    vedettes: { actif: true, titre: langue === "en" ? `✦ ${t.vedettes}` : "✦ Nos Best-Sellers", nombre: 8, triPar: "ventes" as const, colonnes: 4, layout: "grid" as const, showRatings: true, showSoldCount: true },
    collections: { actif: true, titre: langue === "en" ? "Explore Collections" : "Explorer nos collections", layout: "masonry" as const },
    about: { actif: true, titre: `L'histoire de ${nomCourt}`, texte: "Née d'une passion pour la mode authentique, notre boutique propose une sélection de pièces uniques qui allient élégance et accessibilité. Chaque article est choisi avec soin pour vous offrir le meilleur.", layout: "image-right" as const },
    promo: { actif: true, titre: "Nouvelle collection", texte: "Découvrez nos dernières arrivées avant tout le monde — pièces exclusives en quantité limitée", ctaTexte: "Voir les nouveautés", style: "gradient" as const },
    faq: { actif: true, titre: "Questions fréquentes", layout: "accordion" as const, items: [{ question: "Puis-je retourner un article ?", reponse: "Oui, vous disposez de 14 jours après réception pour retourner votre commande. Article dans son état d'origine." }, { question: "Quels modes de paiement ?", reponse: "Orange Money, MTN Mobile Money, paiement à la livraison disponible." }, { question: "Comment connaître ma taille ?", reponse: "Consultez notre guide des tailles disponible sur chaque fiche produit. En cas de doute, contactez-nous." }] },
    avis: { actif: true, titre: t.avis, layout: "carousel" as const, showPhotos: true },
    newsletter: base.newsletter("Rejoignez le club privé", "Accédez en avant-première aux nouvelles collections, ventes privées et offres exclusives", "split"),
  };

  const beautySections = {
    annonce: { actif: true, texte: heroEn?.annonce ?? `✨ Livraison offerte dès 15 000 XOF ✨ Formules 100% naturelles ✨ Satisfaite ou remboursée`, couleurFond: "#7c3aed", couleurTexte: "#ffffff" },
    hero: { actif: true, style: "split" as const, titre: heroEn?.titre ?? `${nomCourt} — La beauté naturelle révélée`, sousTitre: heroEn?.sousTitre ?? "Des soins premium formulés pour sublimer votre beauté authentique, naturellement", ctaTexte: heroEn?.ctaTexte ?? "Découvrir mes soins", ctaLien: "produits", overlay: 40, hauteur: "80vh" as const, textPosition: "left" as const, showSecondCta: true, secondCtaTexte: langue === "en" ? "Beauty Routine" : "Routine beauté", secondCtaLien: "collections" },
    confiance: { actif: true, layout: "icons" as const, items: langue === "en"
      ? [{ icone: "🌿", titre: "100% Natural", texte: "Vegan formulas, paraben-free" },{ icone: "🔬", titre: "Derm. tested", texte: "Validated by dermatologists" },{ icone: "🚀", titre: "24h Delivery", texte: "Shipped fast" },{ icone: "↩️", titre: "Satisfied or refunded", texte: "30 days to try" }]
      : [{ icone: "🌿", titre: "100% naturel", texte: "Formules vegan, sans parabènes" },{ icone: "🔬", titre: "Testé dermo", texte: "Validé par des dermatologues" },{ icone: "🚀", titre: "Livraison 24h", texte: "Expédiée rapidement" },{ icone: "↩️", titre: "Satisfaite ou remboursée", texte: "30 jours pour essayer" }] },
    vedettes: { actif: true, titre: langue === "en" ? `✨ ${t.vedettes}` : "✨ Nos soins best-sellers", nombre: 8, triPar: "ventes" as const, colonnes: 4, layout: "grid" as const, showRatings: true },
    collections: { actif: true, titre: langue === "en" ? "Your Beauty Routine" : "Votre routine beauté", layout: "grid" as const },
    about: { actif: true, titre: `L'ADN de ${nomCourt}`, texte: "Nous croyons que chaque peau est unique. C'est pourquoi nous formulons des soins naturels adaptés à la diversité des peaux africaines. Efficacité prouvée, ingrédients sourcés localement.", layout: "image-left" as const },
    promo: { actif: true, titre: "Votre routine offerte", texte: "Achetez 2 soins, obtenez le 3ème à -50% — composez votre routine idéale", ctaTexte: "Profiter de l'offre", style: "gradient" as const },
    faq: { actif: true, titre: "Vos questions beauté", layout: "accordion" as const, items: [{ question: "Ces soins conviennent-ils aux peaux sensibles ?", reponse: "Oui, toutes nos formules sont hypoallergéniques et testées dermatologiquement pour les peaux les plus sensibles." }, { question: "Quand verrai-je les résultats ?", reponse: "La plupart de nos clientes observent des résultats visibles après 2 à 4 semaines d'utilisation régulière." }, { question: "Les produits sont-ils vegan et cruelty-free ?", reponse: "Absolument, tous nos produits sont 100% vegan et non testés sur les animaux." }] },
    avis: { actif: true, titre: langue === "en" ? "They Love Their Skincare" : "Elles adorent leurs soins", layout: "masonry" as const, showPhotos: true },
    newsletter: base.newsletter("Votre routine beauté offerte", "Inscrivez-vous et recevez notre guide de routine beauté personnalisée + -15% sur votre 1ère commande", "split"),
  };

  const foodSections = {
    annonce: { actif: true, texte: heroEn?.annonce ?? `🌿 Produits frais livrés sous 24h ✦ 100% naturels, sans conservateurs ✦ Commandez avant 12h pour livraison le jour même`, couleurFond: "#c2622d", couleurTexte: "#ffffff" },
    hero: { actif: true, style: "split" as const, titre: heroEn?.titre ?? `${nomCourt} — La saveur authentique`, sousTitre: heroEn?.sousTitre ?? "Des produits frais sélectionnés auprès de producteurs locaux, livrés directement chez vous", ctaTexte: heroEn?.ctaTexte ?? "Commander maintenant", ctaLien: "produits", overlay: 35, hauteur: "70vh" as const, textPosition: "left" as const },
    confiance: { actif: true, layout: "icons" as const, items: langue === "en"
      ? [{ icone: "🌿", titre: "100% Natural", texte: "No artificial preservatives" },{ icone: "🏡", titre: "Local Farmers", texte: "Short supply chain, freshness guaranteed" },{ icone: "❄️", titre: "Cold Chain", texte: "Temperature-controlled delivery" },{ icone: "📦", titre: "24h Delivery", texte: "Shipped within 24h" }]
      : [{ icone: "🌿", titre: "100% naturel", texte: "Sans conservateurs artificiels" },{ icone: "🏡", titre: "Producteurs locaux", texte: "Circuit court, frais garanti" },{ icone: "❄️", titre: "Chaîne du froid", texte: "Livraison température contrôlée" },{ icone: "📦", titre: "Livraison 24h", texte: "Expédiée sous 24h" }] },
    vedettes: { actif: true, titre: langue === "en" ? `🌟 ${t.vedettes}` : "🌟 Nos incontournables", nombre: 8, triPar: "ventes" as const, colonnes: 4, layout: "grid" as const, showRatings: true },
    collections: { actif: true, titre: t.collections, layout: "grid" as const },
    about: { actif: true, titre: `L'histoire de ${nomCourt}`, texte: "Nous travaillons avec des producteurs locaux pour vous apporter des produits frais, naturels et de qualité. Notre engagement : vous dire d'où viennent vos aliments.", layout: "image-right" as const },
    promo: { actif: true, titre: "Panier saveurs", texte: "Composez votre panier de produits frais — livraison offerte dès 20 000 XOF", ctaTexte: "Composer mon panier", style: "split" as const },
    faq: { actif: true, titre: "Questions fréquentes", layout: "accordion" as const, items: [{ question: "Les produits sont-ils vraiment frais ?", reponse: "Oui, nos produits sont récoltés ou préparés dans les 24h avant expédition. Fraîcheur garantie à la livraison." }, { question: "Puis-je commander en gros ?", reponse: "Oui, nous gérons les commandes en gros pour les professionnels. Contactez-nous pour un devis personnalisé." }, { question: "Quel est votre zone de livraison ?", reponse: "Nous livrons dans la capitale et les principales villes. Consultez notre page de livraison pour plus de détails." }] },
    avis: { actif: true, titre: langue === "en" ? "They Love Our Products" : "Ils adorent nos produits", layout: "cards" as const },
    newsletter: base.newsletter("Offre découverte", "Inscrivez-vous et bénéficiez de -10% sur votre première commande + nos recettes hebdomadaires"),
  };

  const techSections = {
    annonce: { actif: true, texte: heroEn?.annonce ?? `🔒 Produits 100% authentiques ✦ Livraison express 24h ✦ SAV réactif`, couleurFond: "#00b4d8", couleurTexte: "#ffffff" },
    hero: { actif: true, style: "centered" as const, titre: heroEn?.titre ?? `${nomCourt} — L'innovation à votre portée`, sousTitre: heroEn?.sousTitre ?? "Les meilleurs produits tech au meilleur prix, avec garantie d'authenticité et SAV réactif", ctaTexte: heroEn?.ctaTexte ?? "Explorer le catalogue", ctaLien: "produits", overlay: 60, hauteur: "80vh" as const, textPosition: "center" as const, showSecondCta: true, secondCtaTexte: langue === "en" ? "Our Guarantees" : "Nos garanties", secondCtaLien: "collections" },
    confiance: { actif: true, layout: "icons" as const, items: langue === "en"
      ? [{ icone: "✅", titre: "100% Genuine", texte: "Authenticity certificate guaranteed" },{ icone: "🛡️", titre: "Responsive support", texte: "We answer quickly" },{ icone: "🚀", titre: "24h Delivery", texte: "Secure packaging" },{ icone: "🔄", titre: "30-Day Returns", texte: "Guaranteed refund" }]
      : [{ icone: "✅", titre: "100% authentique", texte: "Certification d'authenticité garantie" },{ icone: "🛡️", titre: "SAV réactif", texte: "Nous répondons rapidement" },{ icone: "🚀", titre: "Livraison 24h", texte: "Emballage sécurisé" },{ icone: "🔄", titre: "Retour 30 jours", texte: "Remboursement garanti" }] },
    vedettes: { actif: true, titre: langue === "en" ? `🏆 ${t.vedettes}` : "🏆 Les meilleures ventes", nombre: 8, triPar: "ventes" as const, colonnes: 4, layout: "grid" as const, showRatings: true, showSoldCount: true },
    collections: { actif: true, titre: langue === "en" ? "By Category" : "Par catégorie", layout: "grid" as const },
    about: { actif: true, titre: `Pourquoi ${nomCourt} ?`, texte: "Passionnés de tech, nous sélectionnons rigoureusement chaque produit pour vous garantir authenticité, qualité et performance, avec un SAV réactif.", layout: "image-right" as const },
    promo: { actif: true, titre: "Offre reconditionnés premium", texte: "Économisez jusqu'à 40% avec nos produits reconditionnés certifiés — qualité garantie", ctaTexte: "Voir les offres", style: "gradient" as const },
    faq: { actif: true, titre: "Questions fréquentes", layout: "accordion" as const, items: [{ question: "Les produits sont-ils garantis authentiques ?", reponse: "Oui, tous nos produits sont authentiques avec numéro de série vérifiable. Certificat d'authenticité inclus." }, { question: "La garantie est-elle valable localement ?", reponse: "Oui, notre SAV prend en charge toutes les réparations sous garantie localement, sans avoir à exporter le produit." }, { question: "Acceptez-vous les paiements en plusieurs fois ?", reponse: "Oui, nous proposons un paiement en 2 à 3 fois sans frais pour les achats supérieurs à 100 000 XOF." }] },
    avis: { actif: true, titre: langue === "en" ? "They Trust Us" : "Ils nous font confiance", layout: "cards" as const },
    newsletter: base.newsletter("Alertes bons plans tech", "Recevez en premier nos offres exclusives, nouveautés et promotions flash — désabonnement possible à tout moment", "banner"),
  };

  const homeSections = {
    annonce: { actif: true, texte: heroEn?.annonce ?? `🏠 Livraison à domicile ✦ Montage offert sur sélection ✦ Satisfaction garantie 30 jours`, couleurFond: "#4ade80", couleurTexte: "#071a0b" },
    hero: { actif: true, style: "split" as const, titre: heroEn?.titre ?? `${nomCourt} — Votre intérieur, votre signature`, sousTitre: heroEn?.sousTitre ?? "Des meubles et décorations soigneusement sélectionnés pour créer votre espace de vie idéal", ctaTexte: heroEn?.ctaTexte ?? "Explorer la boutique", ctaLien: "produits", overlay: 35, hauteur: "80vh" as const, textPosition: "left" as const },
    confiance: { ...base.confiance },
    vedettes: { actif: true, titre: "✨ Nos best-sellers déco", nombre: 8, triPar: "ventes" as const, colonnes: 4, layout: "grid" as const },
    collections: { actif: true, titre: "Par pièce de vie", layout: "grid" as const },
    about: { actif: true, titre: `L'univers ${nomCourt}`, texte: "Convaincus que votre intérieur doit refléter votre personnalité, nous sélectionnons des pièces alliant design contemporain et matières durables. Chaque produit est testé avant d'intégrer notre catalogue.", layout: "image-right" as const },
    promo: { actif: true, titre: "Rénovation printemps", texte: "Jusqu'à -30% sur une sélection de meubles et décorations — offre limitée", ctaTexte: "Profiter des offres", style: "gradient" as const },
    faq: { actif: true, titre: "Questions fréquentes", layout: "accordion" as const, items: [{ question: "Le montage est-il inclus ?", reponse: "Le montage est offert sur une sélection de meubles dans certaines villes. Disponibilité précisée sur la fiche produit." }, { question: "Livrez-vous les grands meubles ?", reponse: "Oui, nous disposons d'une flotte adaptée au transport de meubles. Livraison planifiée selon vos disponibilités." }, { question: "Puis-je voir les produits avant achat ?", reponse: "Oui, notre showroom est ouvert du lundi au samedi. Contactez-nous pour prendre rendez-vous." }] },
    avis: { actif: true, titre: "Ils ont transformé leur intérieur", layout: "cards" as const },
    newsletter: base.newsletter("Inspirations déco", "Abonnez-vous pour recevoir nos conseils déco, idées d'aménagement et offres exclusives"),
  };

  const servicesSections = {
    annonce: { actif: true, texte: heroEn?.annonce ?? `⚡ Résultats garantis ✦ Paiement sécurisé ✦ Démarrage sous 48h ✦ Révisions illimitées`, couleurFond: "#7c3aed", couleurTexte: "#ffffff" },
    hero: { actif: true, style: "centered" as const, titre: heroEn?.titre ?? `${nomCourt} — L'expertise qui fait la différence`, sousTitre: heroEn?.sousTitre ?? "Des prestations professionnelles calibrées pour dépasser vos attentes, livrées dans les délais", ctaTexte: heroEn?.ctaTexte ?? "Voir nos prestations", ctaLien: "produits", overlay: 50, hauteur: "80vh" as const, textPosition: "center" as const, showSecondCta: true, secondCtaTexte: langue === "en" ? "Contact Us" : "Nous contacter", secondCtaLien: "contact" },
    confiance: { actif: true, layout: "icons" as const, items: [{ icone: "✅", titre: "Résultat garanti", texte: "Révisions jusqu'à satisfaction" },{ icone: "⚡", titre: "Démarrage 48h", texte: "Rapidité & réactivité" },{ icone: "🔒", titre: "Confidentialité", texte: "Vos données protégées" },{ icone: "🏆", titre: "Expertise certifiée", texte: "Professionnels qualifiés" }] },
    vedettes: { actif: true, titre: "Nos prestations phares", nombre: 6, triPar: "ventes" as const, colonnes: 3, layout: "grid" as const },
    collections: { actif: true, titre: "Nos domaines d'expertise", layout: "cards" as const },
    about: { actif: true, titre: `Qui sommes-nous ?`, texte: `${nomCourt} est une agence de professionnels qualifiés dédiés à votre succès. Notre approche : comprendre vos enjeux, proposer des solutions adaptées, livrer des résultats mesurables. Chaque mission est unique.`, layout: "image-right" as const },
    promo: { actif: true, titre: "Offre de lancement", texte: "-20% sur votre première prestation — profitez de nos tarifs préférentiels exclusifs", ctaTexte: "Saisir l'offre", style: "gradient" as const },
    faq: { actif: true, titre: "Questions fréquentes", layout: "accordion" as const, items: [{ question: "Comment démarrer une mission avec vous ?", reponse: "Commandez en ligne, nous vous contactons sous 24h pour un brief détaillé et le lancement de la mission sous 48h." }, { question: "Que se passe-t-il si le résultat ne me convient pas ?", reponse: "Nous offrons des révisions illimitées jusqu'à votre satisfaction complète. Si non livré, remboursement total." }, { question: "Travaillez-vous avec des entreprises de toute taille ?", reponse: "Oui, nous accompagnons aussi bien les entrepreneurs individuels que les grandes entreprises." }] },
    avis: { actif: true, titre: "Ce que disent nos clients", layout: "carousel" as const },
    newsletter: base.newsletter("Conseils business gratuits", "Recevez chaque semaine nos meilleures stratégies et conseils pour développer votre activité", "banner"),
  };

  // Mapping type → sections + order + customSections
  const configs: Record<CategoryType, { sections: any; sectionOrder: string[]; customSections: any[] }> = {
    fashion: {
      sections: fashionSections,
      sectionOrder: ["annonce","hero","confiance","vedettes","collections","promo","avis","about","faq","newsletter"],
      customSections: [
      ],
    },
    beauty: {
      sections: beautySections,
      sectionOrder: ["annonce","hero","confiance","vedettes","about","promo","avis","faq","newsletter"],
      customSections: [
      ],
    },
    food: {
      sections: foodSections,
      sectionOrder: ["annonce","hero","confiance","vedettes","collections","about","promo","avis","faq","newsletter"],
      customSections: [
        { id: "brands_food", type: "brands", actif: true, label: "Nos producteurs", ordre: 7, config: { titre: "Nos producteurs partenaires", logos: [] } },
      ],
    },
    tech: {
      sections: techSections,
      sectionOrder: ["annonce","hero","confiance","vedettes","collections","about","faq","promo","avis","newsletter"],
      customSections: [
      ],
    },
    home: {
      sections: homeSections,
      sectionOrder: ["annonce","hero","confiance","collections","vedettes","promo","avis","about","faq","newsletter"],
      customSections: [],
    },
    jewelry: {
      sections: { ...fashionSections, annonce: { actif: true, texte: `💎 Bijoux authentiques ✦ Livraison sécurisée sous 24h ✦ Écrin offert ✦ Certificat d'authenticité`, couleurFond: "#1a0e00", couleurTexte: "#f5a623" }, hero: { actif: true, style: "fullscreen" as const, titre: `${nomCourt} — Chaque bijou raconte une histoire`, sousTitre: "Des créations d'exception façonnées par des maîtres joailliers, pour vos moments précieux", ctaTexte: "Découvrir les collections", ctaLien: "produits", overlay: 50, hauteur: "100vh" as const, textPosition: "center" as const } },
      sectionOrder: ["annonce","hero","confiance","vedettes","collections","about","promo","avis","newsletter"],
      customSections: [],
    },
    kids: {
      sections: { ...fashionSections, annonce: { actif: true, texte: `👶 Produits certifiés CE ✦ Matériaux non toxiques ✦ Livraison sécurisée ✦ Retour 14 jours`, couleurFond: "#f59e0b", couleurTexte: "#ffffff" } },
      sectionOrder: ["annonce","hero","confiance","vedettes","collections","about","promo","avis","faq","newsletter"],
      customSections: [],
    },
    health: {
      sections: { ...beautySections, annonce: { actif: true, texte: `🌿 Formules naturelles certifiées ✦ Testées cliniquement ✦ Satisfait ou remboursé 30 jours`, couleurFond: "#15803d", couleurTexte: "#ffffff" } },
      sectionOrder: ["annonce","hero","confiance","vedettes","about","promo","avis","faq","newsletter"],
      customSections: [],
    },
    sport: {
      sections: { ...techSections, annonce: { actif: true, texte: `⚡ Équipements pro ✦ Livraison express 24h ✦ Guide des tailles offert ✦ Retour 30 jours`, couleurFond: "#0a0a0a", couleurTexte: "#F5A623" } },
      sectionOrder: ["annonce","hero","confiance","vedettes","collections","promo","avis","about","newsletter"],
      customSections: [
      ],
    },
    services: {
      sections: servicesSections,
      sectionOrder: ["annonce","hero","about","confiance","vedettes","promo","avis","faq","newsletter"],
      customSections: [
        { id: "cta_services", type: "cta-band", actif: true, label: "Appel à l'action", ordre: 8, config: { titre: "Prêt à démarrer votre projet ?", texte: "Contactez-nous aujourd'hui — réponse sous 2h garantie", ctaTexte: "Démarrer maintenant", style: "gradient" } },
      ],
    },
    agriculture: {
      sections: foodSections,
      sectionOrder: ["annonce","hero","confiance","vedettes","about","collections","promo","avis","faq","newsletter"],
      customSections: [],
    },
    artisan: {
      sections: { ...fashionSections, hero: { actif: true, style: "magazine" as const, titre: `${nomCourt} — L'artisanat comme art de vivre`, sousTitre: "Des créations uniques façonnées à la main selon des savoir-faire traditionnels transmis de génération en génération", ctaTexte: "Découvrir les créations", ctaLien: "produits", overlay: 45, hauteur: "80vh" as const, textPosition: "left" as const } },
      sectionOrder: ["annonce","hero","confiance","vedettes","about","collections","promo","avis","newsletter"],
      customSections: [],
    },
    books: {
      sections: { ...fashionSections, annonce: { actif: true, texte: `📚 Livraison offerte dès 10 000 XOF ✦ Catalogue de 5000+ titres ✦ Livres neufs garantis`, couleurFond: "#c2622d", couleurTexte: "#ffffff" } },
      sectionOrder: ["annonce","hero","confiance","vedettes","collections","about","avis","newsletter"],
      customSections: [],
    },
    auto: {
      sections: { ...techSections, annonce: { actif: true, texte: `🔧 Pièces authentiques garanties ✦ Compatibilité vérifiée ✦ Livraison express ✦ SAV expert`, couleurFond: "#010d1f", couleurTexte: "#00b4d8" } },
      sectionOrder: ["annonce","hero","confiance","vedettes","collections","promo","faq","avis","newsletter"],
      customSections: [],
    },
    general: {
      sections: {
        annonce: { actif: true, texte: heroEn?.annonce ?? `✦ Livraison rapide 24-48h ✦ Paiement sécurisé ✦ Satisfaction garantie ✦ Support 7j/7`, couleurFond: "#c2622d", couleurTexte: "#ffffff" },
        hero: { actif: true, style: "split" as const, titre: heroEn?.titre ?? `${nomCourt} — La qualité, simplement`, sousTitre: heroEn?.sousTitre ?? "Des produits soigneusement sélectionnés pour vous satisfaire à chaque commande, avec un service client irréprochable", ctaTexte: heroEn?.ctaTexte ?? "Découvrir nos produits", ctaLien: "produits", overlay: 35, hauteur: "80vh" as const, textPosition: "left" as const },
        confiance: { ...base.confiance },
        vedettes: { actif: true, titre: t.vedettes, nombre: 8, triPar: "ventes" as const, colonnes: 4, layout: "grid" as const, showRatings: true },
        collections: { actif: true, titre: t.collections, layout: "grid" as const },
        about: { actif: true, titre: langue === "en" ? `About ${nomCourt}` : `À propos de ${nomCourt}`, texte: langue === "en" ? "Founded with the ambition to offer you the best value for money, our store rigorously selects every product to guarantee your satisfaction. Customer service available 7 days a week." : "Fondée avec l'ambition de vous offrir le meilleur rapport qualité-prix, notre boutique sélectionne rigoureusement chaque produit pour garantir votre satisfaction. Service client disponible 7j/7.", layout: "image-right" as const },
        promo: { actif: true, titre: t.promo, texte: langue === "en" ? "Discover our exclusive promotions, available for a limited time" : "Découvrez nos promotions exclusives, disponibles pour une durée limitée", ctaTexte: langue === "en" ? "View Deals" : "Voir les offres", style: "gradient" as const },
        faq: { actif: true, titre: t.faq, layout: "accordion" as const, items: langue === "en"
          ? [{ question: "What are your delivery times?", reponse: "Delivery within 24 to 48h for orders placed before 2pm. WhatsApp tracking." }, { question: "Which payment methods do you accept?", reponse: "Mobile Money, bank card, cash on delivery available. 100% secure transactions." }, { question: "How do I return an item?", reponse: "Return within 14 days. Contact us on WhatsApp, refund within 48h." }]
          : [{ question: "Quels sont vos délais de livraison ?", reponse: "Livraison sous 24 à 48h pour les commandes passées avant 14h. Suivi par WhatsApp." }, { question: "Quels modes de paiement acceptez-vous ?", reponse: "Orange Money, MTN Mobile Money, paiement à la livraison. Transactions 100% sécurisées." }, { question: "Comment retourner un article ?", reponse: "Retour sous 14 jours. Contactez-nous par WhatsApp, remboursement sous 48h." }] },
        avis: { actif: true, titre: t.avis, layout: "cards" as const },
        newsletter: base.newsletter("Offres exclusives", "Inscrivez-vous et recevez en avant-première nos meilleures offres et nouveautés"),
      },
      sectionOrder: ["annonce","hero","confiance","vedettes","collections","about","promo","avis","faq","newsletter"],
      customSections: [],
    },
  };

  return configs[type] || configs.general;
}

// ─── Pages À propos & Contact par catégorie ───────────────────────────────────
// Contenu tenant en 2-3 blocs CustomSection réutilisant la même bibliothèque
// que la home (richtext/features) — pour qu'une boutique neuve n'affiche
// jamais de chiffres ni de témoignages inventés (ajoutés par le marchand seulement), ni
// jamais un "À propos" vide. Bespoke pour les catégories les plus fréquentes
// (fashion, food, tech, services), générique de bonne qualité pour le reste.
export function buildAboutContactPages(type: CategoryType, nom: string, langue: Langue = "fr"): {
  aboutPage: ThemeAboutPageConfig;
  contactPage: ThemeContactPageConfig;
} {
  const nomCourt = nom.split(/[\s-]/)[0];
  const en = langue === "en";

  const section = (
    id: string,
    sectionType: CustomSection["type"],
    label: string,
    ordre: number,
    config: Record<string, any>
  ): CustomSection => ({ id, type: sectionType, actif: true, label, ordre, config });

  const richtext = (id: string, ordre: number, titre: string, texte: string): CustomSection =>
    section(id, "richtext", en ? "Our Story" : "Notre histoire", ordre, { titre, texte });

  const features = (
    id: string,
    ordre: number,
    titre: string,
    items: Array<{ icone: string; titre: string; texte: string }>
  ): CustomSection => section(id, "features", en ? "Why us" : "Points forts", ordre, { titre, items });

  let aboutSections: CustomSection[];
  let contactIntro: string;

  switch (type) {
    case "fashion":
      aboutSections = [
        richtext(
          "about_histoire",
          1,
          en ? "Our Story" : "Notre histoire",
          en
            ? `${nomCourt} was born from a passion for fashion that tells a story. We hand-pick every piece so it stays with you well beyond a single season.`
            : `${nomCourt} est né d'une passion pour la mode qui raconte une histoire. Nous sélectionnons chaque pièce avec exigence pour qu'elle vous accompagne bien au-delà d'une saison.`
        ),
        features("about_features", 3, en ? "Why choose us" : "Pourquoi nous faire confiance", [
          { icone: "✦", titre: en ? "Premium quality" : "Qualité premium", texte: en ? "Materials carefully selected for lasting comfort." : "Des matières soigneusement sélectionnées pour un confort durable." },
          { icone: "🚀", titre: en ? "Fast delivery" : "Livraison rapide", texte: en ? "Shipped within 24h, tracked in real time." : "Expédiée sous 24h, suivi en temps réel." },
          { icone: "↩️", titre: en ? "Easy returns" : "Retours faciles", texte: en ? "Exchange or refund within 14 days." : "Échange ou remboursement sous 14 jours." },
        ]),
      ];
      contactIntro = en
        ? `A question about an order or a piece? The ${nomCourt} team is here to help you find your style.`
        : `Une question sur une commande ou une pièce ? L'équipe ${nomCourt} est là pour vous aider à trouver votre style.`;
      break;

    case "food":
      aboutSections = [
        richtext(
          "about_histoire",
          1,
          en ? "Our Story" : "Notre histoire",
          en
            ? `${nomCourt} works hand in hand with local producers to bring fresh, authentic products to your table. Every item is chosen for its quality and its origin. Our commitment: full traceability from farm to doorstep.`
            : `${nomCourt} travaille main dans la main avec des producteurs locaux pour vous apporter des produits frais et authentiques. Chaque article est choisi pour sa qualité et son origine. Notre engagement : une traçabilité totale, du producteur jusqu'à votre porte.`
        ),
      ];
      contactIntro = en
        ? `A question about a product or a delivery? Write to us — the ${nomCourt} team replies quickly, every day.`
        : `Une question sur un produit ou une livraison ? Écrivez-nous — l'équipe ${nomCourt} répond vite, tous les jours.`;
      break;

    case "tech":
      aboutSections = [
        richtext(
          "about_histoire",
          1,
          en ? "Our Story" : "Notre histoire",
          en
            ? `${nomCourt} was founded to make quality tech accessible, with a guarantee of authenticity on every product. We rigorously test our catalogue and back it with responsive after-sales support. Your trust is our best warranty.`
            : `${nomCourt} a été fondée pour rendre la tech de qualité accessible, avec une garantie d'authenticité sur chaque produit. Nous testons rigoureusement notre catalogue et l'accompagnons d'un SAV réactif. Votre confiance est notre meilleure garantie.`
        ),
        features("about_features", 3, en ? "Buy with confidence" : "Acheter en toute confiance", [
          { icone: "✅", titre: en ? "Authenticity guaranteed" : "Authenticité garantie", texte: en ? "Verifiable serial number and certificate on every unit." : "Numéro de série vérifiable et certificat sur chaque appareil." },
          { icone: "📦", titre: en ? "Secure shipping" : "Livraison sécurisée", texte: en ? "Reinforced packaging, insured transport." : "Emballage renforcé, transport assuré." },
        ]),
      ];
      contactIntro = en
        ? `A question about a spec sheet or the warranty? The ${nomCourt} support team answers fast.`
        : `Une question sur une fiche technique ou la garantie ? Le support ${nomCourt} vous répond rapidement.`;
      break;

    case "services":
      aboutSections = [
        richtext(
          "about_histoire",
          1,
          en ? "Who We Are" : "Qui sommes-nous",
          en
            ? `${nomCourt} is a team of qualified professionals dedicated to your success. Our approach: understand your challenges, propose the right solution, deliver measurable results. Every engagement is unique.`
            : `${nomCourt} est une équipe de professionnels qualifiés dédiés à votre réussite. Notre approche : comprendre vos enjeux, proposer la solution adaptée, livrer des résultats mesurables. Chaque mission est unique.`
        ),
        features("about_features", 3, en ? "What you get" : "Ce que vous obtenez", [
          { icone: "✅", titre: en ? "End-to-end delivery" : "Prestation complète", texte: en ? "A turnkey service, no hidden fees." : "Un service clé en main, sans frais cachés." },
          { icone: "🤝", titre: en ? "Dedicated support" : "Accompagnement dédié", texte: en ? "One expert available throughout your project." : "Un expert à votre disposition tout au long de la mission." },
          { icone: "🔒", titre: en ? "Confidentiality" : "Confidentialité", texte: en ? "Your data and projects stay strictly confidential." : "Vos données et projets restent strictement confidentiels." },
        ]),
      ];
      contactIntro = en
        ? `A project in mind? Tell the ${nomCourt} team about it — we get back to you within 24h.`
        : `Un projet en tête ? Parlez-en à l'équipe ${nomCourt} — nous revenons vers vous sous 24h.`;
      break;

    default:
      aboutSections = [
        richtext(
          "about_histoire",
          1,
          en ? "Our Story" : "Notre histoire",
          en
            ? `${nomCourt} was founded with one ambition: offer you the best value for money on every product. We rigorously select our catalogue and stand behind it with attentive customer service. Thank you for being part of our story.`
            : `${nomCourt} a été fondée avec l'ambition de vous offrir le meilleur rapport qualité-prix sur chaque produit. Nous sélectionnons rigoureusement notre catalogue et l'accompagnons d'un service client attentif. Merci de faire partie de notre histoire.`
        ),
      ];
      contactIntro = en
        ? `A question about an order or a product? The ${nomCourt} team replies quickly, every day.`
        : `Une question sur une commande ou un produit ? L'équipe ${nomCourt} vous répond rapidement, tous les jours.`;
      break;
  }

  return {
    aboutPage: { actif: true, sections: aboutSections },
    contactPage: { actif: true, intro: contactIntro, afficherFormulaire: true, sections: [] },
  };
}

// ─── Sélection de la mise en page produit par catégorie ──────────────────────
function selectProductLayout(type: CategoryType): "amazon" | "classic" | "minimal" | "fullwidth" {
  if (["fashion","beauty","jewelry","artisan"].includes(type)) return "amazon";
  if (["services"].includes(type)) return "minimal";
  return "amazon";
}

// ─── Générateur principal ─────────────────────────────────────────────────────
export function generateStoreConfig(opts: {
  categorie: string;
  nomBoutique: string;
  pays?: string;
  devise?: string;
  // "digital" : mêmes designs que le catalogue, achat direct sans panier
  // (voir ThemeConfig.modeBoutique) — seules les sections de fiche produit diffèrent.
  modeBoutique?: "catalogue" | "digital";
}): { themeConfig: Record<string, any> } {
  const { categorie, nomBoutique, pays, modeBoutique = "catalogue" } = opts;
  const type   = detectCategory(categorie);
  const langue = detectLangue(pays);
  const { sections, sectionOrder, customSections } = buildHomeSections(type, nomBoutique, langue);
  const productSections = buildProductSections(type);
  const productLayout = selectProductLayout(type);
  const { aboutPage, contactPage } = buildAboutContactPages(type, nomBoutique, langue);

  const themeConfig: Record<string, any> = {
    modeBoutique,
    sections,
    sectionOrder,
    customSections,
    productPage: {
      layout: productLayout,
      sections: productSections,
    },
    aboutPage,
    contactPage,
  };

  // Les textes par défaut (bandeaux "livraison offerte dès 25 000 XOF"…) sont
  // écrits en franc CFA : on les convertit dans la devise de la boutique.
  const devise = opts.devise || "XOF";
  if (devise === "XOF" || devise === "XAF") return { themeConfig };
  const converti = JSON.stringify(themeConfig).replace(/(\d{1,3}(?: \d{3})+|\d+) XOF/g, (_, n: string) =>
    formatMontant(convertirDepuisXAF(Number(n.replace(/ /g, "")), devise), devise));
  return { themeConfig: JSON.parse(converti) };
}
