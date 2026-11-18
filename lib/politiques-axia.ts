// Rédaction des politiques par Axia (serveur). Données réelles seulement : Axia part du modèle
// construit sur les faits de la boutique (lib/politiques-modeles.ts) et le reformule sans rien
// ajouter ; ce qu'il ne sait pas reste « [À compléter : …] ». Ne lève jamais : sans IA (ou en cas
// d'échec), le modèle est enregistré tel quel.
import { prisma } from "./prisma";
import { completionAuto, hasDeepSeek, hasGemini } from "./llm-client";
import { lireReglagesLivraison } from "./livraison-reglages";
import { lireReglagesPaiement } from "./paiement-pays";
import { PAYS_OPTIONS } from "./devise-convert";
import { lirePolitiques, passagesACompleter, TITRES_POLITIQUES, TYPES_POLITIQUES, type Politiques, type TypePolitique } from "./politiques";
import { MODELES, typeVente, type FaitsBoutique } from "./politiques-modeles";

async function chargerFaits(tenantId: string): Promise<{ faits: FaitsBoutique; politiques: Politiques } | null> {
  const [t, parType] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        nomBoutique: true, description: true, categorie: true, pays: true, devise: true, whatsapp: true, email: true,
        telephone: true, adresse: true, horaires: true, themeConfig: true, parametresLivraison: true,
        parametresPaiement: true, politiques: true, metaPixelId: true, tiktokPixelId: true, snapPixelId: true, gtmId: true,
      },
    }),
    prisma.produit.groupBy({ by: ["type"], where: { tenantId }, _count: { _all: true } }),
  ]);
  if (!t) return null;
  const traceurs = [
    t.metaPixelId && "Meta Pixel (Facebook, Instagram)", t.tiktokPixelId && "TikTok Pixel",
    t.snapPixelId && "Snapchat Pixel", t.gtmId && "Google Tag Manager",
  ].filter(Boolean) as string[];
  return {
    politiques: lirePolitiques(t.politiques),
    faits: {
      nom: t.nomBoutique,
      description: t.description,
      categorie: t.categorie,
      pays: PAYS_OPTIONS.find((p) => p.code === t.pays.toUpperCase())?.nom ?? t.pays,
      devise: t.devise,
      vente: typeVente(Object.fromEntries(parType.map((g) => [g.type, g._count._all])), (t.themeConfig as any)?.modeBoutique),
      email: t.email, telephone: t.telephone, whatsapp: t.whatsapp, adresse: t.adresse, horaires: t.horaires,
      livraison: lireReglagesLivraison(t.parametresLivraison),
      paiement: lireReglagesPaiement(t.parametresPaiement),
      traceurs,
    },
  };
}

const CONSIGNES_AXIA = `Tu es Axia, l'assistant d'Axso. Tu rédiges les politiques d'une boutique en ligne africaine, en français clair, en vouvoyant le client.
Règles absolues :
- Tu pars du TEXTE DE BASE fourni : garde chaque fait (montants, zones, délais, moyens de paiement, coordonnées, règles d'accès) exactement tel quel.
- Tu n'inventes RIEN : aucun prix, délai, adresse, engagement, loi, garantie ou service qui ne figure pas dans le texte de base ou la consigne du marchand.
- Chaque passage « [À compléter : …] » du texte de base doit rester tel quel (même crochets, même libellé), sauf si la consigne du marchand donne précisément l'information.
- S'il manque une information indispensable, ajoute un passage « [À compléter : …] » plutôt que de l'inventer.
- Format : Markdown simple uniquement — titres « ## », listes « - », gras « **…** ». Pas de HTML, pas de lien, pas de tableau. Ne répète pas le titre de la politique en tête.
- Adapte le ton à ce que vend la boutique, sans en rajouter.
Réponds UNIQUEMENT avec un objet JSON dont les clés sont les types demandés et les valeurs le texte Markdown.`;

function nettoyer(x: unknown): string | null {
  if (typeof x !== "string") return null;
  const s = x.replace(/^```(?:markdown|md)?\s*/i, "").replace(/```\s*$/, "").replace(/<[^>]*>/g, "").trim();
  return s.length >= 40 && s.length <= 20000 ? s : null;
}

async function rediger(faits: FaitsBoutique, bases: Partial<Record<TypePolitique, string>>, consigne?: string) {
  const types = Object.keys(bases) as TypePolitique[];
  const r = { ...bases };
  if (!types.length || (!hasGemini() && !hasDeepSeek())) return r;
  try {
    const { text } = await completionAuto([
      { role: "system", content: CONSIGNES_AXIA },
      {
        role: "user",
        content: [
          `Boutique : ${faits.nom} — vend : ${faits.description || "(non précisé)"} — catégorie : ${faits.categorie || "(non précisée)"} — pays : ${faits.pays} — devise : ${faits.devise} — produits : ${faits.vente}.`,
          consigne ? `Consigne du marchand : ${consigne}` : "",
          ...types.map((t) => `=== ${t} (${TITRES_POLITIQUES[t]}) — TEXTE DE BASE ===\n${bases[t]}`),
        ].filter(Boolean).join("\n\n"),
      },
    ], 6000, true);
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    for (const t of types) {
      const texte = nettoyer(json?.[t]);
      // Garde-fou : sans consigne, Axia ne peut pas « résoudre » un passage à compléter (il l'aurait inventé).
      if (texte && (consigne || passagesACompleter(texte).length >= passagesACompleter(bases[t]!).length)) r[t] = texte;
    }
  } catch (err) {
    console.warn("[politiques-axia] rédaction IA échouée, modèle sans IA:", err instanceof Error ? err.message.slice(0, 150) : err);
  }
  return r;
}

/**
 * Écrit des brouillons d'Axia dans Tenant.politiques (non validés, donc jamais publiés).
 * - sans `types` : seulement les politiques encore absentes (ne touche jamais au travail du marchand) ;
 * - avec `types` : réécrit celles-ci ; avec `consigne`, Axia part du texte actuel du marchand.
 */
export async function redigerPolitiques(tenantId: string, opts?: { types?: TypePolitique[]; consigne?: string }): Promise<void> {
  try {
    const charge = await chargerFaits(tenantId);
    if (!charge) return;
    const { faits, politiques } = charge;
    const types = opts?.types?.length
      ? TYPES_POLITIQUES.filter((t) => opts.types!.includes(t))
      : TYPES_POLITIQUES.filter((t) => !politiques[t]?.contenu.trim());
    if (!types.length) return;

    const consigne = opts?.consigne?.trim().slice(0, 1000) || undefined;
    const bases = Object.fromEntries(types.map((t) => [t, (consigne && politiques[t]?.contenu.trim()) || MODELES[t](faits)]));
    const textes = await rediger(faits, bases, consigne);

    // Relecture juste avant l'écriture : une modification faite pendant la rédaction n'est pas perdue pour les autres types.
    const actuel = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { politiques: true } });
    const brut = (actuel?.politiques && typeof actuel.politiques === "object" ? actuel.politiques : {}) as Record<string, unknown>;
    const maintenant = new Date().toISOString();
    for (const t of types) {
      const contenu = textes[t]!;
      brut[t] = { contenu, brouillonAxia: contenu, valideeLe: null, majLe: maintenant };
    }
    await prisma.tenant.update({ where: { id: tenantId }, data: { politiques: brut as any } });
  } catch (err) {
    console.error("[politiques-axia] échec:", err instanceof Error ? err.message : err);
  }
}
