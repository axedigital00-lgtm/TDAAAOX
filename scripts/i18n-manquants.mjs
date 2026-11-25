// Textes français affichés sans traduction anglaise, zone par zone.
// Usage : node scripts/i18n-manquants.mjs [--json fichier]   (sortie : compte par zone et exemples)
// Repère les textes passés à t()/tr() et ceux rangés dans des listes affichées par t(…)
// (libellés de menus, guides, étapes). Un texte est « manquant » s'il n'est dans aucun
// dictionnaire chargé là où il s'affiche (voir les I18nProvider des layouts).
import fs from "node:fs";
import path from "node:path";

const RACINE = process.cwd();
const DOSSIERS = ["app", "components", "lib"];
const dico = (z) => JSON.parse(fs.readFileSync(path.join(RACINE, "lib/i18n/en", `${z}.json`), "utf8"));
const D = Object.fromEntries(["commun", "dashboard", "admin", "boutique", "livreur"].map((z) => [z, dico(z)]));
// Dictionnaires disponibles selon la zone où le texte s'affiche.
const DISPO = { commun: ["commun"], dashboard: ["commun", "dashboard", "boutique"], admin: ["commun", "admin", "dashboard"], boutique: ["commun", "boutique"], livreur: ["commun", "livreur"] };

function zoneDe(f) {
  const p = f.replace(/\\/g, "/");
  if (/^app\/\(admin\)|^components\/(admin|command-center)\//.test(p)) return "admin";
  if (/^app\/\(dashboard\)|^components\/(dashboard|logistique|pos|paiement)\/|^lib\/visites-pages|^app\/transporteur/.test(p)) return "dashboard";
  if (/^app\/\(storefront\)|^components\/storefront\//.test(p)) return "boutique";
  if (/^app\/\(livreur\)|^components\/livreur\//.test(p)) return "livreur";
  return "commun";
}

function fichiers(d) {
  const out = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) { if (!["node_modules", ".next", "i18n"].includes(e.name)) out.push(...fichiers(f)); }
    else if (/\.(tsx?|mjs)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(f);
  }
  return out;
}

const APPEL = /\b(?:t|tr)\(\s*(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g;
const CLES = "label|titre|texte|description|desc|but|action|astuce|nom|detail|contenu|sousTitre|placeholder|title|libelle|message|question|reponse|aide|court";
const PROP = new RegExp(`\\b(?:${CLES})\\s*:\\s*(["'\`])((?:\\\\.|(?!\\1)[^\\\\])*?)\\1`, "g");
const francais = (s) => /[a-zA-ZÀ-ÿ]/.test(s) && (/\s/.test(s) || /[À-ÿ]/.test(s)) && !/^(https?:|\/|#|[a-z-]+:|var\(|[\w-]+\.(png|svg|webp|jpg))/.test(s) && !/\$\{/.test(s) && s.length <= 600 && !/^[a-z0-9_-]+$/.test(s);
const LARGE = process.argv.includes("--large");
const LITTERAL = /(["'])((?:\\.|(?!\1)[^\\\n])*?)\1/g;
const MOT_FR = /[àâçéèêëîïôûùœ]|\b(vous|votre|vos|les|des|pour|avec|une|mes|mon|ma|aucun|commande|boutique|produit|client)\b/i;
const nettoyer = (s, q) => q === "`" ? s : s.replace(/\\n/g, "\n").replace(/\\(["'\\])/g, "$1");

const manquants = { commun: new Map(), dashboard: new Map(), admin: new Map(), boutique: new Map(), livreur: new Map() };
let total = 0;
for (const f of DOSSIERS.flatMap((d) => fichiers(path.join(RACINE, d)))) {
  const rel = path.relative(RACINE, f);
  const src = fs.readFileSync(f, "utf8");
  const traduit = /\buseT\(|\bgetT\(|\btr\(|\bt\(|<Traduit\b/.test(src);
  if (!traduit) continue;
  const zone = zoneDe(rel);
  const vus = new Set();
  for (const m of src.matchAll(APPEL)) if (m[2].trim() && !m[2].includes("${")) vus.add(nettoyer(m[2], m[1]));
  for (const m of src.matchAll(PROP)) if (francais(m[2])) vus.add(nettoyer(m[2], m[1]));
  // --large : toute phrase française entre guillemets dans les fichiers d'interface (listes de
  // suggestions, champs courts t/d/l…), hors routes d'API et code serveur de lib/.
  if (LARGE && !/[\\/]api[\\/]/.test(rel) && !rel.startsWith("lib")) {
    for (const m of src.matchAll(LITTERAL)) {
      const s = nettoyer(m[2], m[1]);
      if (francais(s) && MOT_FR.test(s) && (!/^[a-zà-ÿ]/.test(s.trim()) || s.trim().split(/\s+/).length >= 4) && !/[{}<>=;]|\b(flex|grid|px-|py-|text-|bg-|rounded)\b/.test(s)) vus.add(s);
    }
  }
  for (const s of vus) {
    if (!/[a-zA-ZÀ-ÿ]{2}/.test(s)) continue;
    const coeur = s.trim();
    if (DISPO[zone].some((z) => Object.hasOwn(D[z], s) || Object.hasOwn(D[z], coeur))) continue;
    total++;
    if (!manquants[zone].has(coeur)) manquants[zone].set(coeur, rel);
  }
}

const iJson = process.argv.indexOf("--json");
if (iJson > 0) fs.writeFileSync(process.argv[iJson + 1], JSON.stringify(Object.fromEntries(Object.entries(manquants).map(([z, m]) => [z, Object.fromEntries(m)])), null, 1));
for (const [z, m] of Object.entries(manquants)) console.log(z.padEnd(10), m.size);
console.log("total (uniques par zone) :", Object.values(manquants).reduce((n, m) => n + m.size, 0));
