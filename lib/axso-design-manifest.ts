// ─── Manifeste de la bibliothèque AXSO Design (données pures) ─────────────────
// Séparé de lib/axso-design-library.ts pour rester importable depuis un
// composant client (ex. app/(auth)/inscription/page.tsx) : ce fichier ne
// touche ni `fs` ni `prisma`, contrairement à lib/axso-design-library.ts qui
// lit Templates/*.html et écrit en base — celui-ci est server-only.
//
// Le MANIFESTE ci-dessous est figé une fois pour toutes (produit par
// lib/gemini.ts::extraireGabaritsLibrairie, appelé une seule fois par
// fichier via app/api/internal/build-library-manifest — jamais à
// l'exécution normale) : carteTemplate (gabarit HTML tokenisé de la carte
// produit, seul élément bespoke par design puisque généré par une fonction
// JS jamais exécutée) et selecteurVisuelPdp (conteneur du visuel principal
// en fiche produit).
import { detectCategory, type CategoryType } from "./generate-store-config";

export interface EntreeLibrairie {
  fichier: string;
  nom: string;
  categories: CategoryType[];
  carteTemplate: string;
  selecteurVisuelPdp: string;
  couleurs: { fond?: string; accent?: string; texte?: string; surface?: string };
  polices: { titre?: string; corps?: string };
  ambiance: string[];
  /** Thème premium (nov. 2026) : textes vrais pour tout le secteur, l'accueil garde toutes ses sections (voir personnaliserAccueilLibrairie). */
  accueilComplet?: boolean;
}

// Figé le 2026-09-12 par app/api/internal/build-library-manifest — 15/15
// fichiers de Templates/ analysés avec succès. CODEX, NOIR ATELIER et PULSE
// ajoutés à la main (2026-09-29) : cartes écrites d'après leur CSS.
export const MANIFESTE_LIBRAIRIE: EntreeLibrairie[] = [
  // ─── Thèmes premium (nov. 2026) — en tête : choisis en priorité pour leur secteur ───
  // >>> PREMIUM
  {
    fichier: "saveur-site.html", nom: "SAVEUR", categories: ["food", "agriculture"], accueilComplet: true,
    carteTemplate: `<a href="{{LIEN}}" class="pcard"><div class="pcard-media"><img src="{{IMAGE}}" alt="{{NOM}}"></div><h3 class="pcard-name">{{NOM}}</h3><span class="pcard-price">{{PRIX}}</span><span class="pcard-cta">Commander</span></a>`,
    selecteurVisuelPdp: ".pcard-media",
    couleurs: { fond: "#f7f0e3", accent: "#a8470f", texte: "#3b1418", surface: "#ede0c6" },
    polices: { titre: "fraunces", corps: "dm-sans" },
    ambiance: ["gourmand", "chaleureux", "épicerie fine"],
  },
  {
    fichier: "savoir-site.html", nom: "SAVOIR", categories: ["services", "books"], accueilComplet: true,
    carteTemplate: `<a href="{{LIEN}}" class="pcard"><div class="pcard-media"><img src="{{IMAGE}}" alt="{{NOM}}"></div><h3 class="pcard-name">{{NOM}}</h3><span class="pcard-price">{{PRIX}}</span><span class="pcard-cta">Accéder</span></a>`,
    selecteurVisuelPdp: ".pcard-media",
    couleurs: { fond: "#fbfaf7", accent: "#4338ca", texte: "#16152b", surface: "#eef0fb" },
    polices: { titre: "sora", corps: "inter" },
    ambiance: ["moderne", "inspirant", "pédagogique"],
  },
  {
    fichier: "demeure-site.html", nom: "DEMEURE", categories: ["home", "artisan"], accueilComplet: true,
    carteTemplate: `<a href="{{LIEN}}" class="pcard"><div class="pcard-media"><img src="{{IMAGE}}" alt="{{NOM}}"></div><h3 class="pcard-name">{{NOM}}</h3><span class="pcard-price">{{PRIX}}</span></a>`,
    selecteurVisuelPdp: ".pcard-media",
    couleurs: { fond: "#f5f0e8", accent: "#9c4f2e", texte: "#2e2621", surface: "#e9e0d2" },
    polices: { titre: "cormorant", corps: "jost" },
    ambiance: ["calme", "chaleureux", "éditorial"],
  },
  {
    fichier: "lisiere-site.html", nom: "LISIÈRE", categories: ["fashion"], accueilComplet: true,
    carteTemplate: `<a href="{{LIEN}}" class="pcard"><div class="pcard-media"><img src="{{IMAGE}}" alt="{{NOM}}"></div><h3 class="pcard-name">{{NOM}}</h3><span class="pcard-price">{{PRIX}}</span></a>`,
    selecteurVisuelPdp: ".pcard-media",
    couleurs: { fond: "#f6f1ea", accent: "#8a3324", texte: "#1a1612", surface: "#ece3d6" },
    polices: { titre: "cormorant", corps: "jost" },
    ambiance: ["éditorial", "élégant", "minimaliste"],
  },
  {
    fichier: "volt-site.html", nom: "VOLT", categories: ["tech", "auto"], accueilComplet: true,
    carteTemplate: `<a href="{{LIEN}}" class="pcard"><div class="pcard-media"><img src="{{IMAGE}}" alt="{{NOM}}"></div><h3 class="pcard-name">{{NOM}}</h3><span class="pcard-price">{{PRIX}}</span><span class="pcard-cta">Commander</span></a>`,
    selecteurVisuelPdp: ".pcard-media",
    couleurs: { fond: "#fbfbfd", accent: "#2447ff", texte: "#111316", surface: "#eef0f4" },
    polices: { titre: "space-grotesk", corps: "inter" },
    ambiance: ["tech", "épuré", "lumineux"],
  },
  {
    fichier: "carat-site.html", nom: "CARAT", categories: ["jewelry"], accueilComplet: true,
    carteTemplate: `<a href="{{LIEN}}" class="pcard"><div class="pcard-media"><img src="{{IMAGE}}" alt="{{NOM}}"></div><h3 class="pcard-name">{{NOM}}</h3><span class="pcard-price">{{PRIX}}</span></a>`,
    selecteurVisuelPdp: ".pcard-media",
    couleurs: { fond: "#faf7f2", accent: "#a8844c", texte: "#1b1916", surface: "#f1ebe1" },
    polices: { titre: "cormorant", corps: "jost" },
    ambiance: ["luxe", "raffiné", "éditorial"],
  },
  {
    fichier: "marche-site.html", nom: "MARCHÉ", categories: ["general", "kids", "sport"], accueilComplet: true,
    carteTemplate: `<a href="{{LIEN}}" class="pcard"><div class="pcard-media"><img src="{{IMAGE}}" alt="{{NOM}}"></div><h3 class="pcard-name">{{NOM}}</h3><span class="pcard-price">{{PRIX}}</span></a>`,
    selecteurVisuelPdp: ".pcard-media",
    couleurs: { fond: "#ffffff", accent: "#ff6a13", texte: "#141821", surface: "#f3f4f6" },
    polices: { titre: "outfit", corps: "inter" },
    ambiance: ["généraliste", "joyeux", "efficace"],
  },
  {
    fichier: "eclat-site.html", nom: "ÉCLAT", categories: ["beauty", "health"], accueilComplet: true,
    carteTemplate: `<a href="{{LIEN}}" class="pcard"><div class="pcard-media"><img src="{{IMAGE}}" alt="{{NOM}}"></div><h3 class="pcard-name">{{NOM}}</h3><span class="pcard-price">{{PRIX}}</span></a>`,
    selecteurVisuelPdp: ".pcard-media",
    couleurs: { fond: "#f7efea", accent: "#9c5b4b", texte: "#3b2925", surface: "#efe0d8" },
    polices: { titre: "fraunces", corps: "dm-sans" },
    ambiance: ["doux", "poudré", "sensoriel"],
  },
  // <<< PREMIUM
  // ─── Designs historiques ───
  {
    fichier: "aube-site.html", nom: "AUBE", categories: ["jewelry"],
    carteTemplate: `<a href="{{LIEN}}" class="pcard">
    <div class="frame">
        <img src="{{IMAGE}}" alt="{{NOM}}" style="width:100%;height:100%;object-fit:cover;">
    </div>
    <div class="name">{{NOM}}</div>
    <div class="price">{{PRIX}}</div>
</a>`,
    selecteurVisuelPdp: "#pdpFrame",
    couleurs: { fond: "#F7F3EC", accent: "#B8935A", texte: "#2A2016", surface: "#EFE7D8" },
    polices: { titre: "italiana", corps: "jost" },
    ambiance: ["raffiné", "minimaliste"],
  },
  {
    fichier: "cadran-site.html", nom: "CADRAN", categories: ["jewelry"],
    carteTemplate: `<a class="pcard" href="{{LIEN}}"><div class="media"><img src="{{IMAGE}}" alt="{{NOM}}" style="width:100%;height:100%;object-fit:cover;"></div><div class="name">{{NOM}}</div><div class="price">{{PRIX}}</div></a>`,
    selecteurVisuelPdp: "#pdpStage",
    couleurs: { fond: "#F5F1E8", accent: "#A8823D", texte: "#1C1A16", surface: "#EAE2D0" },
    polices: { titre: "cormorant", corps: "inter" },
    ambiance: ["raffinée", "horlogère"],
  },
  {
    fichier: "circuit-site.html", nom: "CIRCUIT", categories: ["auto", "sport"],
    carteTemplate: `<a href="{{LIEN}}" class="pcard" data-id="{{ID}}"><div class="media"><img src="{{IMAGE}}" alt="{{NOM}}" style="width:100%;height:100%;object-fit:cover;"></div><div class="info"><div class="name">{{NOM}}</div><div class="price"><span class="now">{{PRIX}}</span></div></div></a>`,
    selecteurVisuelPdp: "#pdpMain",
    couleurs: { fond: "#0D0D0F", accent: "#E8142E", texte: "#F5F5F5", surface: "#18181B" },
    polices: { titre: "oswald", corps: "inter" },
    ambiance: ["technique", "industriel", "minimaliste", "dynamique"],
  },
  {
    fichier: "clarte-site.html", nom: "CLARTÉ", categories: ["beauty"],
    carteTemplate: `<a href="{{LIEN}}" class="pcard" data-id="{{ID}}">
    <div class="media">
      <img src="{{IMAGE}}" alt="{{NOM}}" style="width:100%;height:100%;object-fit:cover;">
    </div>
    <div class="name">{{NOM}}</div>
    <div class="price">{{PRIX}}</div>
  </a>`,
    selecteurVisuelPdp: "#pdpMain",
    couleurs: { fond: "#F4F7F3", accent: "#5B8A6B", texte: "#1F2A22", surface: "#E3ECE2" },
    polices: { titre: "plus-jakarta-sans", corps: "plus-jakarta-sans" },
    ambiance: ["naturelle", "clinique", "apaisante"],
  },
  {
    fichier: "codex-site.html", nom: "CODEX", categories: ["books"],
    carteTemplate: `<a href="{{LIEN}}" class="product-card" data-id="{{ID}}"><div class="media"><img src="{{IMAGE}}" alt="{{NOM}}" style="width:100%;height:100%;object-fit:cover;"></div><div class="info"><div class="name">{{NOM}}</div><div class="meta"><span class="price">{{PRIX}}</span></div></div></a>`,
    selecteurVisuelPdp: "#pdpMain",
    couleurs: { fond: "#0B0B12", accent: "#D4AF6A", texte: "#F2F1F6", surface: "#15151F" },
    polices: { titre: "eb-garamond", corps: "inter" },
    ambiance: ["littéraire", "élégant", "sombre"],
  },
  {
    fichier: "equilibre-site.html", nom: "ÉQUILIBRE", categories: ["health", "services"],
    carteTemplate: `<a href="{{LIEN}}" class="pcard"><div class="media"><img src="{{IMAGE}}" alt="{{NOM}}" style="width:100%;height:100%;object-fit:cover;"></div><div class="name">{{NOM}}</div><div class="price">{{PRIX}}</div></a>`,
    selecteurVisuelPdp: "#pdpMain",
    couleurs: { fond: "#FAF7F2", accent: "#8FA888", texte: "#2B2620", surface: "#F0EAE0" },
    polices: { titre: "lora", corps: "inter" },
    ambiance: ["apaisant", "organique"],
  },
  {
    fichier: "grind-site.html", nom: "GRIND", categories: ["sport"],
    carteTemplate: `<a href="{{LIEN}}" class="pcard" data-id="{{ID}}"><div class="media"><img src="{{IMAGE}}" alt="{{NOM}}" style="width:100%;height:100%;object-fit:cover;"></div><div class="info"><div class="name">{{NOM}}</div><div class="price"><span class="now">{{PRIX}}</span></div></div></a>`,
    selecteurVisuelPdp: "#spinFrame",
    couleurs: { fond: "#111111", accent: "#FF5C00", texte: "#F5F5F0", surface: "#1C1C1C" },
    polices: { titre: "anton", corps: "inter" },
    ambiance: ["urbain", "brut"],
  },
  {
    fichier: "halle-site.html", nom: "HALLE", categories: ["home"],
    carteTemplate: `<a href="{{LIEN}}" class="pcard" data-id="{{ID}}"><div class="media"><img src="{{IMAGE}}" alt="{{NOM}}" style="width:100%;height:100%;object-fit:cover;"></div><div class="info"><span class="name">{{NOM}}</span><span class="price">{{PRIX}}</span></div></a>`,
    selecteurVisuelPdp: "#pdpMain",
    couleurs: { fond: "#EDEBE6", accent: "#8B5E34", texte: "#242220", surface: "#DED9D0" },
    polices: { titre: "work-sans", corps: "work-sans" },
    ambiance: ["minimaliste", "artisanal", "sophistiqué"],
  },
  {
    fichier: "ignite-site.html", nom: "IGNITE", categories: ["food"],
    carteTemplate: `<a href="{{LIEN}}" class="pcard" data-id="{{ID}}"><div class="media"><img src="{{IMAGE}}" alt="{{NOM}}" style="width:100%;height:100%;object-fit:cover;"></div><div class="name">{{NOM}}</div><div class="price"><span class="now">{{PRIX}}</span></div></a>`,
    selecteurVisuelPdp: "#pdpCan",
    couleurs: { fond: "#0C0C0C", accent: "#D7FF3D", texte: "#F5F5F0", surface: "#181818" },
    polices: { titre: "anton", corps: "inter" },
    ambiance: ["énergique", "moderne"],
  },
  {
    fichier: "ndop-site.html", nom: "NDOP", categories: ["fashion", "artisan"],
    carteTemplate: `<a class="pcard" href="{{LIEN}}"><div class="media"><img src="{{IMAGE}}" alt="{{NOM}}" style="width:100%;height:100%;object-fit:cover;"></div><div class="info"><span class="name">{{NOM}}</span><span class="price">{{PRIX}}</span></div></a>`,
    selecteurVisuelPdp: "#pdpMain",
    couleurs: { fond: "#F7F1E4", accent: "#B5522E", texte: "#241A0E", surface: "#EFE3C8" },
    polices: { titre: "archivo", corps: "work-sans" },
    ambiance: ["authentique", "artisanal"],
  },
  {
    fichier: "nexus-site.html", nom: "NEXUS", categories: ["tech"],
    carteTemplate: `<a class="pcard" data-id="{{ID}}" href="{{LIEN}}"><div class="media"><img src="{{IMAGE}}" alt="{{NOM}}" style="width:100%;height:100%;object-fit:cover;"></div><div class="info"><div class="name">{{NOM}}</div><div class="price">{{PRIX}}</div></div></a>`,
    selecteurVisuelPdp: ".pdp-stage .frame",
    couleurs: { fond: "#0A0E17", accent: "#00E5FF", texte: "#E8ECF5", surface: "#121826" },
    polices: { titre: "rajdhani", corps: "inter" },
    ambiance: ["technologique", "moderne"],
  },
  {
    fichier: "noir-atelier-site.html", nom: "NOIR ATELIER", categories: ["fashion"],
    carteTemplate: `<a href="{{LIEN}}" class="product-card" data-id="{{ID}}"><div class="media"><img src="{{IMAGE}}" alt="{{NOM}}" style="width:100%;height:100%;object-fit:cover;"></div><div class="info"><span class="name">{{NOM}}</span><span class="price now">{{PRIX}}</span></div></a>`,
    selecteurVisuelPdp: ".pdp-main",
    couleurs: { fond: "#F3F0E9", accent: "#5C1420", texte: "#15131A", surface: "#EAE5D8" },
    polices: { titre: "fraunces", corps: "archivo-narrow" },
    ambiance: ["couture", "raffiné", "éditorial"],
  },
  {
    fichier: "onze-site.html", nom: "ONZE", categories: ["sport"],
    carteTemplate: `<a class="pcard" href="{{LIEN}}"><div class="media" style="background:var(--panel2);"><img src="{{IMAGE}}" alt="{{NOM}}" style="width:100%;height:100%;object-fit:cover;"></div><div class="info"><div class="name">{{NOM}}</div><div class="price"><span class="now">{{PRIX}}</span></div></div></a>`,
    selecteurVisuelPdp: "#pdpStage",
    couleurs: { fond: "#0F1A12", accent: "#FFC83D", texte: "#F0F5EE", surface: "#16241A" },
    polices: { titre: "teko", corps: "inter" },
    ambiance: ["sportif", "premium"],
  },
  {
    fichier: "opal-site.html", nom: "OPAL", categories: ["tech"],
    carteTemplate: `<a href="{{LIEN}}" class="pcard" data-id="{{ID}}"><div class="media"><img src="{{IMAGE}}" alt="{{NOM}}" style="width:100%;height:100%;object-fit:cover;"></div><div class="name">{{NOM}}</div><div class="price">{{PRIX}}</div></a>`,
    selecteurVisuelPdp: "#pdpStage",
    couleurs: { fond: "#000000", accent: "#0A84FF", texte: "#F5F5F7", surface: "#1C1C1E" },
    polices: { titre: "manrope", corps: "inter" },
    ambiance: ["minimaliste", "technologique", "premium"],
  },
  {
    fichier: "pop-site.html", nom: "POP!", categories: ["general", "books"],
    carteTemplate: `<a class="pcard" data-id="{{ID}}" href="{{LIEN}}">
    <div class="media">
        <img src="{{IMAGE}}" alt="{{NOM}}" style="width:100%;height:100%;object-fit:cover;">
    </div>
    <div class="info">
        <div class="name">{{NOM}}</div>
        <div class="price">{{PRIX}}</div>
    </div>
</a>`,
    selecteurVisuelPdp: "#pdpMain",
    couleurs: { fond: "#FFFFFF", accent: "#FF6B6B", texte: "#1A1A2E", surface: "#FFFFFF" },
    polices: { titre: "baloo-2", corps: "nunito-sans" },
    ambiance: ["ludique", "dynamique"],
  },
  {
    fichier: "pulse-site.html", nom: "PULSE", categories: ["sport", "fashion"],
    carteTemplate: `<a href="{{LIEN}}" class="product-card" data-id="{{ID}}"><div class="media"><img src="{{IMAGE}}" alt="{{NOM}}" style="width:100%;height:100%;object-fit:cover;"></div><div class="info"><span class="name">{{NOM}}</span><span class="price">{{PRIX}}</span></div></a>`,
    selecteurVisuelPdp: "#pdpMain",
    couleurs: { fond: "#F4F3EF", accent: "#1440E0", texte: "#0E0E12", surface: "#EAE8E2" },
    polices: { titre: "space-grotesk", corps: "archivo" },
    ambiance: ["sportif", "urbain", "dynamique"],
  },
  {
    fichier: "ring-site.html", nom: "RING", categories: ["sport"],
    carteTemplate: `<a href="{{LIEN}}" class="pcard" data-id="{{ID}}"><div class="media"><img src="{{IMAGE}}" alt="{{NOM}}" style="width:100%;height:100%;object-fit:cover;"></div><div class="info"><div class="name">{{NOM}}</div><div class="price"><span class="now">{{PRIX}}</span></div></div></a>`,
    selecteurVisuelPdp: "#pdpStage",
    couleurs: { fond: "#0C0C0C", accent: "#E31C2A", texte: "#F2F2F0", surface: "#1A1A1A" },
    polices: { titre: "anton", corps: "inter" },
    ambiance: ["minimaliste", "industrielle", "puissante"],
  },
  {
    // weight-tag d'origine affichait un poids ("450g") — retiré : aucun
    // champ équivalent dans ProduitPourClone, mieux vaut l'omettre que d'y
    // afficher {{ID}} brut (ce que le modèle avait fait par défaut).
    fichier: "sentier-site.html", nom: "SENTIER", categories: ["agriculture"],
    carteTemplate: `<a href="{{LIEN}}" class="pcard"><div class="media"><img src="{{IMAGE}}" alt="{{NOM}}" style="width:100%;height:100%;object-fit:cover;"></div><div class="name">{{NOM}}</div><div class="price">{{PRIX}}</div></a>`,
    selecteurVisuelPdp: "#pdpMain",
    couleurs: { fond: "#EDF0E8", accent: "#C1622E", texte: "#22301F", surface: "#DDE3D4" },
    polices: { titre: "chivo", corps: "inter" },
    ambiance: ["naturelle", "minimaliste"],
  },
];

// Choisit l'entrée de la bibliothèque la plus proche d'une catégorie de
// boutique — même principe que l'ancien selectThemeId (lib/generate-store-
// config.ts), réadapté aux designs de la bibliothèque. Premier match dans l'ordre du
// manifeste ; "general" (ou la 1ère entrée) sert de repli.
export function selectionnerGabaritLibrairie(categorie: string): EntreeLibrairie {
  const type = detectCategory(categorie);
  const match = MANIFESTE_LIBRAIRIE.find((e) => e.categories.includes(type));
  if (match) return match;
  const general = MANIFESTE_LIBRAIRIE.find((e) => e.categories.includes("general"));
  return general || MANIFESTE_LIBRAIRIE[0];
}

// ─── Les 4 designs proposés par Stella à l'inscription ─────────────────────────
// Utilisé à l'inscription (app/(auth)/inscription) ; le Constructeur et la page
// Thèmes proposent ensuite les 18 designs (voir ThemeConfig.designsOrigine).
export function detecterCategorie(vente: string): string {
  const v = vente.toLowerCase();
  const map: { kw: string[]; cat: string }[] = [
    { kw:["mode","vêtement","tissu","kente","wax","pagne","robe","chemise","couture","habit"], cat:"fashion" },
    { kw:["livre","librairie","papeterie","carnet","stylo","roman","manga","fourniture"], cat:"books" },
    { kw:["bijou","bague","collier","bracelet","en or","argent","joaillerie","perle","montre"], cat:"jewelry" },
    { kw:["cosmétique","beauté","soin","maquillage","parfum","crème","sérum","skincare","cheveux"], cat:"beauty" },
    { kw:["sport","fitness","gym","training","football","basket","rugby","musculation","running"], cat:"sport" },
    { kw:["tech","électronique","gadget","téléphone","ordinateur","accessoire tech","console"], cat:"tech" },
    { kw:["alimentation","nourriture","épice","café","thé","boisson","restaur","food","snack"], cat:"food" },
    { kw:["artisan","handmade","fait main","poterie","sculpture","art","peinture","tisser"], cat:"artisan" },
    { kw:["maison","décor","meuble","intérieur","ameublement","bougie","plante"], cat:"home" },
    { kw:["formation","cours","ebook","digital","service","conseil","coaching","mentoring"], cat:"services" },
    { kw:["agriculture","bio","naturel","ferme","fruits","légumes","jardinage","herbes"], cat:"agriculture" },
  ];
  // Début de mot uniquement : « sport » ne doit pas matcher « or » (bijoux), ni « cartes » « art ».
  const trouve = (k: string) => new RegExp(`(^|[^\\p{L}])${k}`, "u").test(v);
  for (const { kw, cat } of map) {
    if (kw.some(trouve)) return cat;
  }
  return "general";
}

// Retourne 4 IDs de thèmes adaptés à la catégorie, priorité au themeId du plan.
// Boutique digitale : designs sobres (formations, ebooks, logiciels…) sauf livres / tech.
export function choisir4Themes(vente: string, planThemeId?: string, digital = false): string[] {
  let cat = detecterCategorie(vente);
  if (digital && !["books", "tech", "services"].includes(cat)) cat = "services";
  // Thèmes premium uniquement (nov. 2026) : le 1er est celui du secteur, les 3 autres des styles voisins.
  const L = (...n: string[]) => n.map((x) => `${x}-site.html`);
  const parCat: Record<string, string[]> = {
    fashion:     L("lisiere", "carat", "eclat", "marche"),
    books:       L("savoir", "demeure", "lisiere", "marche"),
    jewelry:     L("carat", "lisiere", "eclat", "demeure"),
    beauty:      L("eclat", "carat", "lisiere", "demeure"),
    sport:       L("marche", "volt", "lisiere", "savoir"),
    tech:        L("volt", "marche", "savoir", "carat"),
    food:        L("saveur", "marche", "demeure", "eclat"),
    artisan:     L("demeure", "lisiere", "carat", "saveur"),
    home:        L("demeure", "eclat", "saveur", "marche"),
    services:    L("savoir", "volt", "demeure", "lisiere"),
    agriculture: L("saveur", "demeure", "marche", "eclat"),
    general:     L("marche", "lisiere", "volt", "saveur"),
  };
  let themes = [...(parCat[cat] || parCat.general)];
  // Le design suggéré par l'IA passe en premier s'il fait partie de la sélection (jamais un ancien design).
  if (planThemeId && themes.includes(planThemeId)) {
    themes = [planThemeId, ...themes.filter(t => t !== planThemeId)];
  }
  return themes.slice(0, 4);
}

