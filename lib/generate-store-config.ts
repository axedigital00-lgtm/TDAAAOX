import { CONFIG_PAYS, LIBELLES_PAIEMENT, estCodePays } from "./sourcing/pays";
import { PAYS_OPTIONS, codePays } from "./devise-convert";
/**
 * Génère un themeConfig complet et optimisé à partir du profil business du marchand.
 * Chaque boutique créée démarre avec un setup premium calibré pour sa catégorie.
 * Aucune promesse écrite à la place du marchand (délai, retour, remise, garantie, certificat) :
 * seulement ce qui est vrai aujourd'hui (paiement à la livraison ; Mobile Money « bientôt
 * disponible ») et ses coordonnées réelles (WhatsApp, e-mail, pays).
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

// ─── Langue et coordonnées ────────────────────────────────────────────────────
type Langue = "fr" | "en";

function detectLangue(pays?: string): Langue {
  if (!pays) return "fr";
  const code = pays.toUpperCase();
  if (estCodePays(code)) return CONFIG_PAYS[code].langue;
  const p = pays.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  if (/nigeria|ghana|kenya|uganda|tanzania|zambia|zimbabwe|botswana|namibia|south.?africa|gambia|sierra.?leone|liberia|ethiopia|malawi|rwanda|angola/.test(p)) return "en";
  return "fr";
}

/** Coordonnées réelles du marchand, placées dans le bandeau d'en-tête, la FAQ et la page Contact. */
export type ContactBoutique = { whatsapp?: string | null; email?: string | null };

type Ctx = { nom: string; langue: Langue; digital: boolean; whatsapp: string; email: string; paysNom: string; mobileMoney: string };

function contexte(nom: string, pays: string | undefined, digital: boolean, contact: ContactBoutique = {}): Ctx {
  const code = codePays(pays);
  const langue = detectLangue(pays);
  const moyens = code && estCodePays(code) ? CONFIG_PAYS[code].moyensPaiement.filter((m) => m !== "cod" && m !== "carte" && m !== "virement") : [];
  return {
    nom: nom.split(/[\s-]/)[0], // premier mot du nom de boutique
    langue, digital,
    whatsapp: contact.whatsapp?.trim() ?? "",
    email: contact.email?.trim() ?? "",
    paysNom: (code && PAYS_OPTIONS.find((p) => p.code === code)?.nom) || pays || "",
    mobileMoney: moyens.length ? moyens.map((m) => LIBELLES_PAIEMENT[m]).join(", ") : "Mobile Money",
  };
}

// ─── Textes communs, vrais pour toute boutique neuve ──────────────────────────
function textesCommuns(c: Ctx) {
  const en = c.langue === "en";
  const annonce = [
    !c.digital && (en ? "Cash on delivery" : "Paiement à la livraison"),
    c.whatsapp && `WhatsApp ${c.whatsapp}`,
    c.paysNom && `📍 ${c.paysNom}`,
  ].filter(Boolean).join(" ✦ ") || (en ? `Welcome to ${c.nom}` : `Bienvenue chez ${c.nom}`);

  const confiance = [
    !c.digital && { icone: "💵", titre: en ? "Cash on delivery" : "Paiement à la livraison", texte: en ? "Pay when you receive your order" : "Vous payez à la réception de votre commande" },
    { icone: "📱", titre: c.mobileMoney, texte: en ? "Coming soon" : "Bientôt disponible" },
    !c.digital && { icone: "🚚", titre: en ? "Delivery" : "Livraison", texte: en ? "Areas and fees shown before you order" : "Zones et frais affichés avant de commander" },
    c.whatsapp && { icone: "💬", titre: "WhatsApp", texte: c.whatsapp },
  ].filter(Boolean) as { icone: string; titre: string; texte: string }[];

  const joindre = [c.whatsapp && (en ? `on WhatsApp at ${c.whatsapp}` : `sur WhatsApp au ${c.whatsapp}`), c.email && (en ? `by email at ${c.email}` : `par e-mail à ${c.email}`)]
    .filter(Boolean).join(en ? " or " : " ou ");
  const faq = [
    {
      question: en ? "How can I pay?" : "Comment payer ?",
      reponse: (c.digital
        ? (en ? "Available payment methods are shown when you order." : "Les moyens de paiement disponibles sont affichés au moment de la commande.")
        : (en ? "Cash on delivery: you pay when you receive your order." : "Paiement à la livraison : vous payez à la réception de votre commande."))
        + (en ? ` ${c.mobileMoney}: coming soon.` : ` ${c.mobileMoney} : bientôt disponible.`),
    },
    !c.digital && {
      question: en ? "Where do you deliver, and at what cost?" : "Où livrez-vous et à quel prix ?",
      reponse: en ? "Delivery areas and fees are shown when you place your order." : "Les zones desservies et les frais de livraison s'affichent au moment de la commande.",
    },
    {
      question: en ? "How can I contact you?" : "Comment vous contacter ?",
      reponse: joindre ? (en ? `Write to us ${joindre}.` : `Écrivez-nous ${joindre}.`) : (en ? "From our Contact page." : "Depuis notre page Contact."),
    },
  ].filter(Boolean) as { question: string; reponse: string }[];

  return {
    annonce, confiance, faq,
    promo: en
      ? { titre: "New arrivals", texte: `Discover the latest products from ${c.nom}`, ctaTexte: "See the products" }
      : { titre: "Nouveautés", texte: `Découvrez les derniers produits de ${c.nom}`, ctaTexte: "Voir les produits" },
    newsletter: en
      ? { titre: `Join ${c.nom}`, texte: `Get ${c.nom}'s news by email`, placeholder: "your@email.com", ctaTexte: "Subscribe" }
      : { titre: `Rejoignez ${c.nom}`, texte: `Recevez les nouveautés de ${c.nom} par e-mail`, placeholder: "votre@email.com", ctaTexte: "Je m'abonne" },
    about: en
      ? `Welcome to ${c.nom}. Browse our selection and write to us with any question.`
      : `Bienvenue chez ${c.nom}. Découvrez notre sélection et écrivez-nous pour toute question.`,
  };
}

// ─── Mise en page et accroche par catégorie (aucune promesse) ─────────────────
type Bilingue = [fr: string, en: string];
type Cat = {
  annonce: [fond: string, texte: string];
  hero: { style: "centered" | "split" | "fullscreen" | "magazine"; hauteur: "70vh" | "80vh" | "100vh"; textPosition: "left" | "center"; overlay: number; titre: Bilingue; sousTitre: Bilingue; cta: Bilingue; second?: [fr: string, en: string, lien: string] };
  vedettes: Bilingue; colonnes?: number;
  collections: Bilingue; layoutCollections?: "grid" | "masonry" | "cards";
  about: Bilingue; aboutLayout?: "image-left" | "image-right";
  avis?: Bilingue;
  ordre: string[];
};

const ORDRE = ["annonce", "hero", "confiance", "vedettes", "collections", "about", "promo", "avis", "faq", "newsletter"];

const CATS: Record<CategoryType, Cat> = {
  fashion: {
    annonce: ["#111111", "#F5A623"],
    hero: { style: "fullscreen", hauteur: "100vh", textPosition: "center", overlay: 55, titre: ["Votre style, votre identité", "Your Style, Your Identity"], sousTitre: ["Des pièces choisies pour révéler votre personnalité", "Pieces chosen to reveal your personality"], cta: ["Découvrir la collection", "Shop the Collection"], second: ["Voir les collections", "View Collections", "collections"] },
    vedettes: ["✦ Nos coups de cœur", "✦ Our Picks"], collections: ["Explorer nos collections", "Explore Collections"], layoutCollections: "masonry",
    about: ["L'histoire de {nom}", "The {nom} Story"],
    ordre: ["annonce", "hero", "confiance", "vedettes", "collections", "promo", "avis", "about", "faq", "newsletter"],
  },
  beauty: {
    annonce: ["#7c3aed", "#ffffff"],
    hero: { style: "split", hauteur: "80vh", textPosition: "left", overlay: 40, titre: ["La beauté révélée", "Beauty Revealed"], sousTitre: ["Des soins choisis pour sublimer votre beauté", "Care products chosen to enhance your beauty"], cta: ["Découvrir mes soins", "Shop My Skincare"], second: ["Routine beauté", "Beauty Routine", "collections"] },
    vedettes: ["✨ Nos soins coups de cœur", "✨ Our Favourite Products"], collections: ["Votre routine beauté", "Your Beauty Routine"],
    about: ["L'univers de {nom}", "The {nom} World"], aboutLayout: "image-left", avis: ["Ce que disent nos clientes", "What Our Customers Say"],
    ordre: ["annonce", "hero", "confiance", "vedettes", "about", "promo", "avis", "faq", "newsletter"],
  },
  food: {
    annonce: ["#c2622d", "#ffffff"],
    hero: { style: "split", hauteur: "70vh", textPosition: "left", overlay: 35, titre: ["Des saveurs qui rassemblent", "Flavours That Bring People Together"], sousTitre: ["Des produits savoureux, à commander en quelques clics", "Tasty products, ordered in a few clicks"], cta: ["Commander maintenant", "Order Now"] },
    vedettes: ["🌟 Nos incontournables", "🌟 Must-Haves"], collections: ["Explorer par catégorie", "Shop by Category"],
    about: ["L'histoire de {nom}", "The {nom} Story"],
    ordre: ORDRE,
  },
  tech: {
    annonce: ["#00b4d8", "#ffffff"],
    hero: { style: "centered", hauteur: "80vh", textPosition: "center", overlay: 60, titre: ["L'innovation à votre portée", "Innovation Within Reach"], sousTitre: ["Les produits tech qu'il vous faut, à commander en quelques clics", "The tech you need, ordered in a few clicks"], cta: ["Explorer le catalogue", "Browse Catalogue"] },
    vedettes: ["Nos produits phares", "Featured Products"], collections: ["Par catégorie", "By Category"],
    about: ["Pourquoi {nom} ?", "Why {nom}?"],
    ordre: ["annonce", "hero", "confiance", "vedettes", "collections", "about", "faq", "promo", "avis", "newsletter"],
  },
  home: {
    annonce: ["#4ade80", "#071a0b"],
    hero: { style: "split", hauteur: "80vh", textPosition: "left", overlay: 35, titre: ["Votre intérieur, votre signature", "Your Interior, Your Signature"], sousTitre: ["Des meubles et décorations choisis pour votre espace de vie", "Furniture and decor chosen for your living space"], cta: ["Explorer la boutique", "Explore the Store"] },
    vedettes: ["✨ Nos coups de cœur déco", "✨ Our Decor Picks"], collections: ["Par pièce de vie", "By Room"],
    about: ["L'univers {nom}", "The {nom} World"],
    ordre: ["annonce", "hero", "confiance", "collections", "vedettes", "promo", "avis", "about", "faq", "newsletter"],
  },
  jewelry: {
    annonce: ["#1a0e00", "#f5a623"],
    hero: { style: "fullscreen", hauteur: "100vh", textPosition: "center", overlay: 50, titre: ["Chaque bijou raconte une histoire", "Every Jewel Tells a Story"], sousTitre: ["Des bijoux choisis pour vos moments précieux", "Jewellery chosen for your precious moments"], cta: ["Découvrir les collections", "Discover Collections"] },
    vedettes: ["✦ Nos coups de cœur", "✦ Our Picks"], collections: ["Explorer nos collections", "Explore Collections"], layoutCollections: "masonry",
    about: ["L'histoire de {nom}", "The {nom} Story"],
    ordre: ["annonce", "hero", "confiance", "vedettes", "collections", "about", "promo", "avis", "faq", "newsletter"],
  },
  kids: {
    annonce: ["#f59e0b", "#ffffff"],
    hero: { style: "split", hauteur: "80vh", textPosition: "left", overlay: 40, titre: ["Pour les petits et les grands", "For Little Ones and Parents"], sousTitre: ["Des articles choisis pour vos enfants", "Items chosen for your children"], cta: ["Découvrir", "Discover"] },
    vedettes: ["Nos coups de cœur", "Our Picks"], collections: ["Explorer par catégorie", "Shop by Category"],
    about: ["L'histoire de {nom}", "The {nom} Story"],
    ordre: ORDRE,
  },
  health: {
    annonce: ["#15803d", "#ffffff"],
    hero: { style: "split", hauteur: "80vh", textPosition: "left", overlay: 40, titre: ["Votre bien-être au quotidien", "Your Everyday Wellbeing"], sousTitre: ["Des produits de bien-être pour votre routine", "Wellness products for your routine"], cta: ["Découvrir", "Shop Wellness"] },
    vedettes: ["Nos produits phares", "Featured Products"], collections: ["Explorer par catégorie", "Shop by Category"],
    about: ["L'univers de {nom}", "The {nom} World"], aboutLayout: "image-left",
    ordre: ["annonce", "hero", "confiance", "vedettes", "about", "promo", "avis", "faq", "newsletter"],
  },
  sport: {
    annonce: ["#0a0a0a", "#F5A623"],
    hero: { style: "centered", hauteur: "80vh", textPosition: "center", overlay: 60, titre: ["Repoussez vos limites", "Push Your Limits"], sousTitre: ["L'équipement qu'il vous faut, à commander en quelques clics", "The gear you need, ordered in a few clicks"], cta: ["Explorer le catalogue", "Browse Catalogue"] },
    vedettes: ["Nos produits phares", "Featured Products"], collections: ["Par catégorie", "By Category"],
    about: ["Pourquoi {nom} ?", "Why {nom}?"],
    ordre: ["annonce", "hero", "confiance", "vedettes", "collections", "promo", "avis", "about", "faq", "newsletter"],
  },
  services: {
    annonce: ["#7c3aed", "#ffffff"],
    hero: { style: "centered", hauteur: "80vh", textPosition: "center", overlay: 50, titre: ["L'expertise qui fait la différence", "Expertise That Makes the Difference"], sousTitre: ["Des prestations adaptées à vos besoins", "Services tailored to your needs"], cta: ["Voir nos prestations", "View Our Services"], second: ["Nous contacter", "Contact Us", "contact"] },
    vedettes: ["Nos prestations", "Our Services"], colonnes: 3, collections: ["Nos domaines", "Our Areas"], layoutCollections: "cards",
    about: ["Qui sommes-nous ?", "Who We Are"],
    ordre: ["annonce", "hero", "about", "confiance", "vedettes", "promo", "avis", "faq", "newsletter"],
  },
  agriculture: {
    annonce: ["#c2622d", "#ffffff"],
    hero: { style: "split", hauteur: "70vh", textPosition: "left", overlay: 35, titre: ["Le meilleur de la terre", "The Best of the Land"], sousTitre: ["Des produits de la terre, à commander en quelques clics", "Farm products, ordered in a few clicks"], cta: ["Commander maintenant", "Order Now"] },
    vedettes: ["🌟 Nos incontournables", "🌟 Must-Haves"], collections: ["Explorer par catégorie", "Shop by Category"],
    about: ["L'histoire de {nom}", "The {nom} Story"],
    ordre: ["annonce", "hero", "confiance", "vedettes", "about", "collections", "promo", "avis", "faq", "newsletter"],
  },
  artisan: {
    annonce: ["#111111", "#F5A623"],
    hero: { style: "magazine", hauteur: "80vh", textPosition: "left", overlay: 45, titre: ["L'artisanat comme art de vivre", "Craft as a Way of Life"], sousTitre: ["Des créations faites main, uniques", "Unique handmade creations"], cta: ["Découvrir les créations", "Discover the Creations"] },
    vedettes: ["✦ Nos coups de cœur", "✦ Our Picks"], collections: ["Explorer nos collections", "Explore Collections"],
    about: ["L'histoire de {nom}", "The {nom} Story"],
    ordre: ["annonce", "hero", "confiance", "vedettes", "about", "collections", "promo", "avis", "faq", "newsletter"],
  },
  books: {
    annonce: ["#c2622d", "#ffffff"],
    hero: { style: "split", hauteur: "80vh", textPosition: "left", overlay: 40, titre: ["Nourrissez votre curiosité", "Feed Your Curiosity"], sousTitre: ["Une sélection à découvrir et à commander en quelques clics", "A selection to discover and order in a few clicks"], cta: ["Découvrir", "Discover"] },
    vedettes: ["Nos coups de cœur", "Our Picks"], collections: ["Explorer par catégorie", "Shop by Category"],
    about: ["L'histoire de {nom}", "The {nom} Story"],
    ordre: ["annonce", "hero", "confiance", "vedettes", "collections", "about", "avis", "faq", "newsletter"],
  },
  auto: {
    annonce: ["#010d1f", "#00b4d8"],
    hero: { style: "centered", hauteur: "80vh", textPosition: "center", overlay: 60, titre: ["Tout pour votre véhicule", "Everything for Your Vehicle"], sousTitre: ["Les pièces et accessoires qu'il vous faut", "The parts and accessories you need"], cta: ["Explorer le catalogue", "Browse Catalogue"] },
    vedettes: ["Nos produits phares", "Featured Products"], collections: ["Par catégorie", "By Category"],
    about: ["Pourquoi {nom} ?", "Why {nom}?"],
    ordre: ["annonce", "hero", "confiance", "vedettes", "collections", "promo", "faq", "avis", "newsletter"],
  },
  general: {
    annonce: ["#c2622d", "#ffffff"],
    hero: { style: "split", hauteur: "80vh", textPosition: "left", overlay: 35, titre: ["La qualité, simplement", "Quality, Simply"], sousTitre: ["Des produits choisis avec soin, à commander en quelques clics", "Carefully chosen products, ordered in a few clicks"], cta: ["Découvrir nos produits", "Shop Now"] },
    vedettes: ["Nos coups de cœur", "Our Picks"], collections: ["Explorer par catégorie", "Shop by Category"],
    about: ["À propos de {nom}", "About {nom}"],
    ordre: ORDRE,
  },
};

// ─── Sections homepage par catégorie ──────────────────────────────────────────
function buildHomeSections(type: CategoryType, c: Ctx): {
  sections: any;
  sectionOrder: string[];
  customSections: any[];
} {
  const cat = CATS[type] ?? CATS.general;
  const i = c.langue === "en" ? 1 : 0;
  const nommer = (t: Bilingue) => t[i].replace("{nom}", c.nom);
  const t = textesCommuns(c);
  const h = cat.hero;
  const sections = {
    annonce: { actif: true, texte: t.annonce, couleurFond: cat.annonce[0], couleurTexte: cat.annonce[1] },
    hero: {
      actif: true, style: h.style, titre: `${c.nom} — ${h.titre[i]}`, sousTitre: h.sousTitre[i], ctaTexte: h.cta[i], ctaLien: "produits",
      overlay: h.overlay, hauteur: h.hauteur, textPosition: h.textPosition,
      ...(h.second && { showSecondCta: true, secondCtaTexte: h.second[i], secondCtaLien: h.second[2] }),
    },
    confiance: { actif: true, layout: "icons" as const, items: t.confiance },
    vedettes: { actif: true, titre: cat.vedettes[i], nombre: 8, triPar: "ventes" as const, colonnes: cat.colonnes ?? 4, layout: "grid" as const, showRatings: true },
    collections: { actif: true, titre: cat.collections[i], layout: cat.layoutCollections ?? "grid" },
    about: { actif: true, titre: nommer(cat.about), texte: t.about, layout: cat.aboutLayout ?? "image-right" },
    promo: { actif: true, ...t.promo, style: "gradient" as const },
    faq: { actif: true, titre: c.langue === "en" ? "Frequently Asked Questions" : "Questions fréquentes", layout: "accordion" as const, items: t.faq },
    avis: { actif: true, titre: (cat.avis ?? ["Ce que disent nos clients", "What Our Customers Say"])[i], layout: "cards" as const },
    newsletter: { actif: true, ...t.newsletter, style: "centered" as const },
  };
  const customSections = type === "services"
    ? [{ id: "cta_services", type: "cta-band", actif: true, label: "Appel à l'action", ordre: 8, config: c.langue === "en"
      ? { titre: "Ready to start your project?", texte: "Write to us to talk about it.", ctaTexte: "Contact us", style: "gradient" }
      : { titre: "Prêt à démarrer votre projet ?", texte: "Écrivez-nous pour en parler.", ctaTexte: "Nous contacter", style: "gradient" } }]
    : [];
  return { sections, sectionOrder: cat.ordre, customSections };
}

// ─── Pages À propos & Contact ─────────────────────────────────────────────────
// Un « À propos » jamais vide, sans chiffres, témoignages ni engagements inventés
// (ajoutés par le marchand seulement). La page Contact affiche déjà WhatsApp, e-mail
// et adresse de la boutique ; l'intro rappelle où elle se trouve.
export function buildAboutContactPages(type: CategoryType, nom: string, langue: Langue = "fr", contact: ContactBoutique & { pays?: string } = {}): {
  aboutPage: ThemeAboutPageConfig;
  contactPage: ThemeContactPageConfig;
} {
  const c = contexte(nom, contact.pays, false, contact);
  const en = langue === "en";
  const histoire: CustomSection = {
    id: "about_histoire", type: "richtext", actif: true, label: en ? "Our Story" : "Notre histoire", ordre: 1,
    config: { titre: en ? (type === "services" ? "Who We Are" : "Our Story") : (type === "services" ? "Qui sommes-nous" : "Notre histoire"), texte: textesCommuns({ ...c, langue }).about },
  };
  const ou = c.paysNom ? ` (${c.paysNom})` : "";
  const contactIntro = en
    ? `A question about an order or a product? Write to the ${c.nom} team${ou}.`
    : `Une question sur une commande ou un produit ? Écrivez à l'équipe ${c.nom}${ou}.`;
  return {
    aboutPage: { actif: true, sections: [histoire] },
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
  whatsapp?: string | null;
  email?: string | null;
}): { themeConfig: Record<string, any> } {
  const { categorie, nomBoutique, pays, modeBoutique = "catalogue" } = opts;
  const type   = detectCategory(categorie);
  const c = contexte(nomBoutique, pays, modeBoutique === "digital", opts);
  const { sections, sectionOrder, customSections } = buildHomeSections(type, c);
  const { aboutPage, contactPage } = buildAboutContactPages(type, nomBoutique, c.langue, { ...opts, pays });

  return {
    themeConfig: {
      modeBoutique,
      sections,
      sectionOrder,
      customSections,
      productPage: {
        layout: selectProductLayout(type),
        sections: buildProductSections(type),
      },
      aboutPage,
      contactPage,
    },
  };
}
