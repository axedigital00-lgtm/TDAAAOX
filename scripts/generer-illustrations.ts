// Génère les illustrations vectorielles du site dans la charte AXSO : noir, blanc, jaune du logo.
// Usage : npx tsx scripts/generer-illustrations.ts
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DOSSIERS } from "../lib/dossiers-fonctionnalites";
import { solutions, exemples } from "../lib/catalogue-fonctionnalites";
import { ARTICLES, GUIDES } from "../lib/contenu-site";
import { routesIllustrees, visuelEspace } from "../lib/visuels-espaces";

type P = { bg: string; panneau: string; trait: string; doux: string; a: string; surA: string };
const NOIR: P = { bg: "#0B0B0A", panneau: "#1C1B18", trait: "#F7F3EA", doux: "#55514A", a: "#EDA900", surA: "#111111" };
const CLAIR: P = { bg: "#F6F2E9", panneau: "#FFFFFF", trait: "#111111", doux: "#CFC8B8", a: "#EDA900", surA: "#111111" };
const JAUNE: P = { bg: "#EDA900", panneau: "#FFFFFF", trait: "#111111", doux: "#B98400", a: "#111111", surA: "#EDA900" };

const r = (x: number, y: number, w: number, h: number, rx: number, fill: string, extra = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;
const c = (x: number, y: number, n: number, fill: string, extra = "") => `<circle cx="${x}" cy="${y}" r="${n}" fill="${fill}" ${extra}/>`;
const l = (d: string, stroke: string, w = 14) => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const f = (d: string, fill: string) => `<path d="${d}" fill="${fill}"/>`;
const coche = (x: number, y: number, p: P) => c(x, y, 46, p.a) + l(`M${x - 20} ${y}l14 15l27-31`, p.surA, 10);

const MOTIFS: Record<string, (p: P) => string> = {
  panier: (p) => l("M120 150h70l62 270h270l52-190H220", p.trait, 20) + f("M250 260h310l-36 135H282z", p.a) + c(290, 490, 34, p.trait) + c(490, 490, 34, p.trait),
  livraison: (p) => r(70, 170, 210, 170, 22, p.a) + l("M175 170v60", p.surA, 10) + l("M300 300h130l50-110h60M480 190l60 130", p.trait, 18) + l("M220 400h180", p.trait, 18) + c(170, 430, 78, p.panneau, `stroke="${p.trait}" stroke-width="18"`) + c(540, 430, 78, p.panneau, `stroke="${p.trait}" stroke-width="18"`) + c(170, 430, 16, p.a) + c(540, 430, 16, p.a),
  paiement: (p) => r(190, 50, 240, 490, 40, p.panneau, `stroke="${p.trait}" stroke-width="14"`) + r(270, 76, 80, 10, 5, p.doux) + coche(310, 240, p) + r(240, 330, 140, 16, 8, p.trait) + r(260, 366, 100, 12, 6, p.doux) + r(232, 430, 156, 54, 16, p.a) + c(500, 170, 58, p.a) + c(530, 300, 38, p.trait) + c(90, 360, 46, p.a),
  boutique: (p) => r(110, 230, 400, 280, 16, p.panneau, `stroke="${p.trait}" stroke-width="14"`) + f("M130 90h360l60 150H70z", p.a) + l("M190 90l-24 150M310 90v150M430 90l24 150", p.surA, 8) + r(160, 320, 120, 190, 10, p.trait) + r(330, 320, 130, 100, 10, p.doux),
  colis: (p) => f("M310 70l210 110v240L310 530 100 420V180z", p.a) + f("M310 290l210-110v240L310 530z", p.panneau) + l("M100 180l210 110 210-110M310 290v240M205 125l210 110", p.trait, 12),
  promo: (p) => f("M300 60h210a30 30 0 0 1 30 30v210L290 550a30 30 0 0 1-42 0L60 362a30 30 0 0 1 0-42z", p.a) + c(440, 160, 36, p.bg) + l("M230 370l120-120", p.surA, 16) + c(225, 275, 20, p.surA) + c(355, 345, 20, p.surA),
  clients: (p) => c(190, 210, 76, p.doux) + f("M70 470a120 130 0 0 1 240 0z", p.doux) + c(430, 210, 76, p.doux) + f("M310 470a120 130 0 0 1 240 0z", p.doux) + c(310, 180, 96, p.a) + f("M150 520a160 180 0 0 1 320 0z", p.trait),
  campagne: (p) => f("M110 240l310-130v340L110 330z", p.a) + r(70, 230, 70, 110, 16, p.trait) + l("M180 350l36 140h70l-30-115", p.trait, 16) + l("M480 210q50 75 0 150M535 150q90 135 0 270", p.trait, 14),
  analyse: (p) => r(70, 70, 480, 460, 28, p.panneau, `stroke="${p.doux}" stroke-width="3"`) + r(130, 340, 60, 130, 10, p.doux) + r(225, 270, 60, 200, 10, p.doux) + r(320, 300, 60, 170, 10, p.doux) + r(415, 180, 60, 290, 10, p.a) + l("M130 240l100-60 90 40 130-100", p.trait, 12) + c(450, 120, 18, p.a),
  stella: (p) => c(310, 300, 165, p.a) + f("M310 165q18 117 135 135q-117 18-135 135q-18-117-135-135q117-18 135-135z", p.surA) + f("M505 70q8 52 60 60q-52 8-60 60q-8-52-60-60q52-8 60-60z", p.trait) + f("M105 410q6 38 44 44q-38 6-44 44q-6-38-44-44q38-6 44-44z", p.trait),
  chat: (p) => f("M90 110h340a40 40 0 0 1 40 40v180a40 40 0 0 1-40 40H210l-90 80v-80h-30a40 40 0 0 1-40-40V150a40 40 0 0 1 40-40z", p.a) + r(110, 180, 260, 22, 11, p.surA) + r(110, 240, 180, 22, 11, p.surA) + f("M320 300h200a36 36 0 0 1 36 36v120a36 36 0 0 1-36 36h-10v62l-70-62H320a36 36 0 0 1-36-36V336a36 36 0 0 1 36-36z", p.panneau) + l("M360 395l36 36 76-76", p.trait, 14),
  flux: (p) => l("M160 150h150v150h150M310 300v150h-130", p.doux, 10) + r(70, 90, 180, 120, 22, p.a) + r(390, 240, 180, 120, 22, p.panneau, `stroke="${p.trait}" stroke-width="10"`) + r(70, 400, 180, 120, 22, p.panneau, `stroke="${p.trait}" stroke-width="10"`) + c(310, 300, 34, p.trait) + c(160, 150, 18, p.surA),
  globe: (p) => c(310, 300, 225, p.panneau, `stroke="${p.trait}" stroke-width="12"`) + l("M85 300h450M310 75q-130 225 0 450M310 75q130 225 0 450M125 180h370M125 420h370", p.doux, 7) + c(235, 215, 26, p.a) + c(410, 350, 26, p.a) + l("M235 215Q360 180 410 350", p.a, 8),
  securite: (p) => f("M310 50l210 80v170c0 130-90 210-210 250-120-40-210-120-210-250V130z", p.a) + l("M225 300l62 62 112-126", p.surA, 24),
  document: (p) => r(130, 60, 340, 480, 26, p.panneau, `stroke="${p.trait}" stroke-width="12"`) + r(185, 140, 150, 20, 10, p.a) + r(185, 210, 230, 14, 7, p.doux) + r(185, 255, 230, 14, 7, p.doux) + r(185, 300, 170, 14, 7, p.doux) + r(185, 390, 110, 50, 12, p.trait) + coche(470, 470, p),
  entreprise: (p) => r(100, 170, 220, 360, 12, p.panneau, `stroke="${p.trait}" stroke-width="12"`) + r(320, 280, 200, 250, 12, p.a) + [220, 300, 380, 460].flatMap((y) => [150, 235].map((x) => r(x, y, 40, 44, 6, p.doux))).join("") + [330, 410].flatMap((y) => [365, 440].map((x) => r(x, y, 40, 44, 6, p.surA))).join(""),
  theme: (p) => r(60, 90, 500, 410, 26, p.panneau, `stroke="${p.trait}" stroke-width="12"`) + l("M60 170h500", p.trait, 10) + c(110, 130, 11, p.a) + c(150, 130, 11, p.doux) + r(105, 215, 210, 240, 16, p.a) + r(350, 215, 165, 100, 14, p.doux) + r(350, 345, 165, 110, 14, p.trait),
  formation: (p) => f("M310 170C250 120 160 110 70 130v340c90-20 180-10 240 40z", p.a) + f("M310 170c60-50 150-60 240-40v340c-90-20-180-10-240 40z", p.panneau) + l("M310 170v340M380 240c40-15 80-20 120-20M380 310c40-15 80-20 120-20", p.trait, 11) + f("M310 30l26 54 60 8-44 42 11 60-53-29-53 29 11-60-44-42 60-8z", p.trait),
  caisse: (p) => r(140, 70, 340, 220, 22, p.panneau, `stroke="${p.trait}" stroke-width="12"`) + r(185, 115, 250, 28, 10, p.a) + r(185, 170, 150, 16, 8, p.doux) + f("M100 320h420l40 200H60z", p.a) + [370, 430].flatMap((y) => [180, 280, 380].map((x) => r(x, y, 62, 36, 8, p.surA))).join(""),
  retour: (p) => l("M180 220h220a120 120 0 0 1 0 240H210", p.trait, 26) + f("M210 110v220L70 220z", p.a) + r(250, 280, 130, 110, 14, p.a),
  equipe: (p) => [[150, 190], [310, 130], [470, 190]].map(([x, y], i) => c(x, y, 62, i === 1 ? p.a : p.doux)).join("") + f("M60 430a90 100 0 0 1 180 0zM380 430a90 100 0 0 1 180 0z", p.doux) + f("M190 470a120 150 0 0 1 240 0z", p.trait) + r(90, 490, 440, 18, 9, p.a),
};
const CLES: [RegExp, string][] = [
  [/stella|axia|agent|ia-pour|chatbot|agentique|veille/, "stella"], [/whatsapp|message|chat|community/, "chat"], [/livr|route|moto|transport|logistique|suivi|colis-|expedi/, "livraison"], [/paiement|mobile-money|wallet|finance|abonnement|encaiss|commande$|conversion|ventes|tarifs/, "paiement"],
  [/caisse|pos-|magasin|market|stand/, "caisse"], [/retour|remboursement|migration/, "retour"], [/stock|colis|sourcing|preparation|reception|cabas|bags|import/, "colis"], [/promo|reduction|codes|affiliation/, "promo"], [/campagne|publicite|marketing|press|lancement|nouveaute/, "campagne"],
  [/analyse|analytics|board|pilotage|objectif|gamification/, "analyse"], [/automati|workflow|flux|connecteur|feed/, "flux"], [/marche|globe|domaine|plateforme/, "globe"], [/taxe|devis|document|guide|fichier|docs/, "document"], [/entreprise|gros/, "entreprise"], [/theme|builder|constructeur|studio|medias|atelier|vitrine/, "theme"],
  [/formation|academy|tutorial|produits-numeriques|premiers/, "formation"], [/client|avis|temoignage|fidelite/, "clients"], [/equipe|about|histoire|jobs/, "equipe"], [/boutique|accueil|hero|catalogue|produit|variante|fiche/, "boutique"], [/securite|admin|connexion/, "securite"],
];
const hash = (s: string) => [...s].reduce((n, x) => (Math.imul(n, 31) + x.charCodeAt(0)) >>> 0, 2166136261);
const motif = (nom: string) => CLES.find(([re]) => re.test(nom))?.[1] ?? MOTIFS_ORDRE[hash(nom) % MOTIFS_ORDRE.length];
const MOTIFS_ORDRE = Object.keys(MOTIFS);

function decor(h: number, p: P) {
  const type = h % 4, x = 180 + ((h >>> 3) % 1240), y = 130 + ((h >>> 7) % 740), n = 90 + ((h >>> 11) % 150);
  const points = Array.from({ length: 11 }, (_, i) => Array.from({ length: 5 }, (_, j) => ((h >>> ((i + j) % 24)) & 3) ? c(70 + i * 34, 760 + j * 34, 4, p.doux) : "").join("")).join("");
  const formes = [
    `<circle cx="${x}" cy="${y}" r="${n * 2}" fill="none" stroke="${p.doux}" stroke-width="2"/><circle cx="${x}" cy="${y}" r="${n * 3}" fill="none" stroke="${p.doux}" stroke-width="2" stroke-dasharray="4 14"/>`,
    Array.from({ length: 6 }, (_, i) => `<path d="M-40 ${620 + i * 54}C420 ${360 + i * 44} 980 ${920 - i * 26} 1640 ${500 + i * 52}" fill="none" stroke="${p.doux}" stroke-width="2"/>`).join(""),
    Array.from({ length: 9 }, (_, i) => `<path d="M${i * 200} 0V1000M0 ${i * 125}H1600" stroke="${p.doux}" stroke-width="1" opacity=".55"/>`).join(""),
    Array.from({ length: 5 }, (_, i) => `<rect x="${1600 - 170 - i * 120}" y="${980 - (((h >>> i) % 5) + 2) * 62}" width="84" height="${(((h >>> i) % 5) + 2) * 62}" rx="10" fill="${p.doux}" opacity=".35"/>`).join(""),
  ][type];
  return formes + points + c(1340 - ((h >>> 5) % 180), 150 + ((h >>> 9) % 90), 16 + ((h >>> 13) % 22), p.a) + `<path d="M${210 + ((h >>> 4) % 170)} ${120 + ((h >>> 8) % 90)}h34m-17-17v34" stroke="${p.trait}" stroke-width="4" stroke-linecap="round"/>`;
}
export function illustration(nom: string) {
  const h = hash(nom), p = h % 7 === 0 ? JAUNE : h % 2 ? NOIR : CLAIR, miroir = (h >>> 2) % 2 === 1;
  const e = 1.08 + ((h >>> 6) % 4) * .05, dx = ((h >>> 10) % 5 - 2) * 26;
  const t = `translate(${800 + dx} 500) scale(${miroir ? -e : e} ${e}) translate(-310 -300)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true"><rect width="1600" height="1000" fill="${p.bg}"/>${decor(h, p)}<g transform="${t}">${MOTIFS[motif(nom)](p)}</g></svg>`;
}

if (process.argv[1]?.includes("generer-illustrations")) {
  const racine = process.cwd(), sortie = join(racine, "public", "illustrations");
  mkdirSync(sortie, { recursive: true });
  const noms = new Set<string>();
  const ajouter = (u?: string | null) => { const m = u?.match(/\/illustrations\/([a-z0-9-]+)\.svg/i); if (m) noms.add(m[1]); };
  readdirSync(join(racine, "public", "visuels")).forEach((x) => noms.add(x.replace(/\.[a-z]+$/, "")));
  readdirSync(join(racine, "public", "editorial")).filter((x) => x.endsWith(".webp")).forEach((x) => noms.add(x.replace(".webp", "")));
  DOSSIERS.forEach((d) => { ajouter(d.image); d.chapitres.forEach((x) => ajouter(x.photo)); });
  solutions.forEach((s) => { noms.add(`annuaire-${s.slug}`); noms.add(`apercu-${s.slug}`); exemples[s.slug].options.forEach((o) => ajouter(o.image)); });
  ARTICLES.forEach((a) => { ajouter(a.image); noms.add(`index-${a.slug}`); });
  GUIDES.forEach((g) => noms.add(`guide-${g.slug}`));
  routesIllustrees.forEach((x) => ajouter(visuelEspace(x)));
  const parcourir = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? parcourir(join(d, e.name)) : /\.(tsx?|css)$/.test(e.name) ? [join(d, e.name)] : []);
  for (const fichier of ["app", "components", "lib"].flatMap((d) => parcourir(join(racine, d)))) for (const m of readFileSync(fichier, "utf8").matchAll(/\/illustrations\/([a-z0-9-]+)\.svg/gi)) noms.add(m[1]);
  for (const m of readFileSync(join(racine, "components/marketing/home/HomeAxso.tsx"), "utf8").matchAll(/scene:\s*"([a-z0-9-]+)"/g)) noms.add(`bento-${m[1]}`);
  for (const m of readFileSync(join(racine, "app/nouveautes/page.tsx"), "utf8").matchAll(/\bh:\s*"([a-z0-9-]+)"/g)) noms.add(`nouveaute-${m[1]}`);
  for (const nom of noms) writeFileSync(join(sortie, `${nom}.svg`), illustration(nom));
  console.log(`${noms.size} illustrations`);
}
