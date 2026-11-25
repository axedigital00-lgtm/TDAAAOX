// Traduit en anglais les textes manquants (sortie de i18n-manquants.mjs) et les range dans
// lib/i18n/en/<zone>.json. Glossaire et ton fixés ; chaque lot est vérifié (mêmes clés, mêmes
// {0}, retours à la ligne, pas de texte resté en français) et refait sinon.
// Usage : node scripts/i18n-traduire.mjs manquants.json [--essai 20] [--modele gemini-3.5-flash]
// Clé : GEMINI_API_KEY (lue dans l'environnement, ou dans env.prod / .env.local, jamais affichée).
import fs from "node:fs";
import path from "node:path";

const RACINE = process.cwd();
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const SOURCE = process.argv[2];
const ESSAI = Number(arg("--essai", "0"));
const MODELE = arg("--modele", "gemini-3.5-flash-lite");
const LOT = 40, PARALLELE = Number(arg("--parallele", "2"));

function cle() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  for (const f of ["env.prod", ".env.local"]) {
    const p = path.join(RACINE, f);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, "utf8").match(/^GEMINI_API_KEY=(.+)$/m);
    if (m) return m[1].trim().replace(/^"|"$/g, "");
  }
  throw new Error("GEMINI_API_KEY introuvable");
}
const CLE = cle();

const CONSIGNES = `You translate the user interface of AXSO, a premium e-commerce platform for African merchants (online store, WhatsApp selling, point of sale, delivery, AI assistant named Stella).
Translate each French string into natural, polished, concise US English, in the tone of a top-tier SaaS product (Shopify, Stripe): clear, warm, direct, never literal or awkward. Address the user as "you" (French "tu" and "vous" both become "you").
Strict rules:
- Keep every placeholder exactly as written: {0}, {1}, {2}… (same count, same numbers). Keep line breaks, emojis, punctuation like "…", "→", "·", "•", leading/trailing spaces, HTML tags and Markdown.
- Never translate: AXSO, Axso, Stella, FCFA, XAF, XOF, CFA, Mobile Money, MTN, MTN MoMo, Orange Money, Wave, Moov, Airtel, M-Pesa, WhatsApp, Facebook, Instagram, TikTok, Google, Meta, Shopify, ChatGPT, Claude, Gemini, city and country names (use their English names: Cameroun→Cameroon, Côte d'Ivoire→Ivory Coast, Sénégal→Senegal).
- Glossary (use consistently): boutique→store; ma boutique→my store; marchand→merchant; livreur→courier; commande→order; client→customer; produit→product; fiche produit→product page; caisse→POS; panier→cart; paiement à la livraison→cash on delivery; retrait (d'argent)→withdrawal; portefeuille/wallet→wallet; séquestre→holding period; forfait/palier→plan; abonnement→subscription; coins→coins; tableau de bord→dashboard; constructeur→store builder; thème→theme; réseau de livraison→delivery network; société de livraison→delivery company; code promo→promo code; affilié→affiliate; parrainage→referral; vitrine→storefront; accueil→Home; Ventes→Sales; Catalogue→Catalog; Logistique→Logistics; Croissance→Growth; Finances→Finances; Paramètres→Settings; brouillon→draft; en ligne→online / live (for a store).
- French guillemets « » become “ ”. Keep numbers and currency formatting as they are.
- If a string is already English, a brand name or a code, return it unchanged.
Answer with a JSON object only: the same keys as the input (the French strings, unchanged) mapped to their English translations.`;

const places = (s) => (s.match(/\{\d+\}/g) || []).sort().join(",");
const accentsFr = /[àâçéèêëîïôûùüœ]/i;

async function traduireLot(textes, essai = 0) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELE}:generateContent?key=${CLE}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: CONSIGNES }] },
      contents: [{ role: "user", parts: [{ text: JSON.stringify(Object.fromEntries(textes.map((t) => [t, ""]))) }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    }),
  }).catch((e) => ({ ok: false, status: 0, text: async () => e.message }));
  if (!r.ok) {
    const msg = (await r.text()).slice(0, 200).replace(CLE, "***");
    if (essai < 4) { await new Promise((ok) => setTimeout(ok, 4000 * (essai + 1))); return traduireLot(textes, essai + 1); }
    throw new Error(`Gemini ${r.status} : ${msg}`);
  }
  const d = await r.json();
  let sortie = {};
  try { sortie = JSON.parse(d.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "{}"); } catch { sortie = {}; }
  const bons = {}, arefaire = [];
  for (const t of textes) {
    const en = sortie[t];
    const ok = typeof en === "string" && en.trim() && places(en) === places(t)
      && (t.match(/\n/g) || []).length === (en.match(/\n/g) || []).length
      && !(en === t && accentsFr.test(t) && t.split(/\s+/).length > 1);
    if (ok) bons[t] = en; else arefaire.push(t);
  }
  if (arefaire.length && essai < 3) Object.assign(bons, await traduireLot(arefaire, essai + 1));
  return bons;
}

async function main() {
  const manquants = JSON.parse(fs.readFileSync(SOURCE, "utf8"));
  const bilan = {};
  for (const [zone, m] of Object.entries(manquants)) {
    let textes = Object.keys(m);
    if (ESSAI) textes = textes.slice(0, ESSAI);
    if (!textes.length) continue;
    const lots = [];
    for (let i = 0; i < textes.length; i += LOT) lots.push(textes.slice(i, i + LOT));
    const traduit = {};
    for (let i = 0; i < lots.length; i += PARALLELE) {
      const res = await Promise.all(lots.slice(i, i + PARALLELE).map((l) => traduireLot(l).catch((e) => { console.error(zone, e.message); return {}; })));
      res.forEach((x) => Object.assign(traduit, x));
      process.stdout.write(`\r${zone} ${Object.keys(traduit).length}/${textes.length}   `);
    }
    console.log();
    if (ESSAI) { console.log(JSON.stringify(traduit, null, 1)); continue; }
    const f = path.join(RACINE, "lib/i18n/en", `${zone}.json`);
    // Format des dictionnaires (indentation d'un espace), écrit après chaque zone : un quota épuisé en route ne perd rien.
    const brut = fs.readFileSync(f, "utf8");
    const existant = JSON.parse(brut);
    fs.writeFileSync(f, JSON.stringify({ ...existant, ...traduit }, null, 1) + (brut.endsWith("\n") ? "\n" : ""));
    bilan[zone] = { traduits: Object.keys(traduit).length, demandes: textes.length };
  }
  if (!ESSAI) console.log(JSON.stringify(bilan));
}
main().catch((e) => { console.error("ERREUR", String(e.message).replace(CLE, "***")); process.exit(1); });
