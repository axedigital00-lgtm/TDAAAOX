// Référencement des boutiques publiées : textes de description propres, adresses canoniques, données
// structurées schema.org (Google : prix, stock, avis en étoiles, fil d'Ariane) et plan du site.
// Chaque boutique est référencée sur sa propre adresse (domaine propre, sinon nom.axsoafrica.com).
import { prisma } from "@/lib/prisma";
import { urlBoutique } from "@/lib/utils";

const ORIGINE = process.env.NEXT_PUBLIC_APP_URL || "https://www.axsoafrica.com";

type TenantAdresse = { slug: string; sousDomaineAt?: unknown; customDomain?: string | null; domaineActifAt?: unknown };

/** Adresse absolue d'une page de la boutique (canonique, plan du site, données structurées). */
export const adresse = (t: TenantAdresse, chemin = "") => urlBoutique(t, chemin, ORIGINE);

/** Image en adresse absolue (les moteurs ignorent les chemins relatifs). */
export const imageAbsolue = (src: string | null | undefined) => (!src ? undefined : /^https?:\/\//.test(src) ? src : `${ORIGINE}${src.startsWith("/") ? "" : "/"}${src}`);

/** Texte brut pour une meta description : sans HTML ni Markdown, espaces réduits, coupé au mot (≤ max). */
export function texteSeo(brut: string | null | undefined, max = 160): string {
  const s = String(brut ?? "")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/[*_#>`~]+/g, " ").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const coupe = s.slice(0, max - 1);
  return coupe.slice(0, Math.max(coupe.lastIndexOf(" "), max - 30)).replace(/[\s,;:.–-]+$/, "") + "…";
}

/** Chemin public d'un produit : son slug s'il en a un (adresse lisible), sinon son identifiant. */
export const cheminProduit = (p: { id: string; slug?: string | null }) => `/produits/${p.slug || p.id}`;

/** JSON-LD sûr dans une balise script (« < » échappé). */
export const jsonLd = (o: unknown) => JSON.stringify(o).replace(/</g, "\\u003c");

type ProduitSeo = {
  id: string; slug?: string | null; nom: string; description?: string | null; images: string[]; prix: number;
  stock: number; type: string; sku?: string | null; categorie?: string | null; avis?: { note: number }[];
};

/** Données structurées Product + Offer (+ note moyenne), et fil d'Ariane, pour une fiche produit. */
export function donneesProduit(t: TenantAdresse & { nomBoutique: string; devise: string }, p: ProduitSeo) {
  const url = adresse(t, cheminProduit(p));
  const notes = (p.avis ?? []).map((a) => a.note).filter((n) => n >= 1 && n <= 5);
  const enStock = p.type !== "physique" || p.stock > 0;
  const produit = {
    "@context": "https://schema.org", "@type": "Product", name: p.nom, url,
    image: p.images.slice(0, 6).map(imageAbsolue), description: texteSeo(p.description, 500) || p.nom,
    ...(p.sku && { sku: p.sku }), ...(p.categorie && { category: p.categorie }),
    brand: { "@type": "Brand", name: t.nomBoutique },
    offers: {
      "@type": "Offer", url, price: Math.round(p.prix * 100) / 100, priceCurrency: t.devise || "XAF",
      availability: enStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition", seller: { "@type": "Organization", name: t.nomBoutique },
    },
    ...(notes.length && { aggregateRating: { "@type": "AggregateRating", ratingValue: Math.round((notes.reduce((a, b) => a + b, 0) / notes.length) * 10) / 10, reviewCount: notes.length } }),
  };
  const ariane = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t.nomBoutique, item: adresse(t) },
      { "@type": "ListItem", position: 2, name: p.nom, item: url },
    ],
  };
  return [produit, ariane];
}

/** Données structurées de l'accueil : la boutique (OnlineStore) et le site (WebSite). */
export function donneesBoutique(t: TenantAdresse & { nomBoutique: string; description?: string | null; logoUrl?: string | null; telephone?: string | null; whatsappNumero?: string | null; adresse?: string | null; pays?: string | null }) {
  const url = adresse(t);
  return [
    {
      "@context": "https://schema.org", "@type": "OnlineStore", name: t.nomBoutique, url,
      ...(t.description && { description: texteSeo(t.description, 300) }), ...(t.logoUrl && { logo: imageAbsolue(t.logoUrl), image: imageAbsolue(t.logoUrl) }),
      ...((t.telephone || t.whatsappNumero) && { telephone: t.telephone || t.whatsappNumero }),
      ...((t.adresse || t.pays) && { address: { "@type": "PostalAddress", ...(t.adresse && { streetAddress: t.adresse }), ...(t.pays && { addressCountry: t.pays }) } }),
    },
    { "@context": "https://schema.org", "@type": "WebSite", name: t.nomBoutique, url },
  ];
}

/** Pages publiques d'une boutique pour son plan du site (produits actifs, collections, pages publiées). */
export async function pagesBoutique(slug: string) {
  const t = await prisma.tenant.findUnique({ where: { slug }, select: { id: true, slug: true, statut: true, customDomain: true, domaineActifAt: true, sousDomaineAt: true, updatedAt: true, themeConfig: true } });
  if (!t || t.statut !== "active") return null;
  const [produits, collections] = await Promise.all([
    prisma.produit.findMany({ where: { tenantId: t.id, actif: true }, select: { id: true, slug: true, updatedAt: true, images: true, nom: true }, orderBy: { updatedAt: "desc" }, take: 5000 }),
    prisma.collection.findMany({ where: { tenantId: t.id, actif: true }, select: { slug: true, createdAt: true }, take: 1000 }),
  ]);
  const perso = Object.entries(((t.themeConfig ?? {}) as { pagesPerso?: Record<string, { statut?: string; visibilite?: string; seo?: { noindex?: boolean } }> }).pagesPerso ?? {})
    .filter(([, p]) => p.statut === "publiee" && p.visibilite !== "lien" && !p.seo?.noindex).map(([cle]) => cle);
  return {
    tenant: t,
    urls: [
      { loc: adresse(t), lastmod: t.updatedAt, priorite: 1 },
      ...produits.map((p) => ({ loc: adresse(t, cheminProduit(p)), lastmod: p.updatedAt, priorite: 0.8, image: imageAbsolue(p.images[0]), titre: p.nom })),
      ...collections.map((c) => ({ loc: adresse(t, `/collections/${c.slug}`), lastmod: c.createdAt, priorite: 0.6 })),
      { loc: adresse(t, "/produits"), lastmod: t.updatedAt, priorite: 0.7 },
      ...perso.map((cle) => ({ loc: adresse(t, `/p/${cle}`), lastmod: t.updatedAt, priorite: 0.5 })),
      { loc: adresse(t, "/a-propos"), lastmod: t.updatedAt, priorite: 0.4 },
      { loc: adresse(t, "/contact"), lastmod: t.updatedAt, priorite: 0.3 },
    ],
  };
}

/** Pages privées d'une boutique, jamais référencées. */
export const PAGES_PRIVEES = ["/panier", "/checkout", "/paiement", "/mon-compte", "/commande-confirmee", "/confirmation", "/facture", "/tracking", "/wishlist", "/devis", "/livreur", "/formation", "/certificat"];
