// Offres Releasit COD AXSO : paliers de quantité, case à cocher, ajout en 1 clic après la commande,
// offre à la fermeture du formulaire. Aucun prix ne vient du navigateur : les paliers sont écrits dans
// Produit.venteGros (appliqués par la création de commande), les produits ajoutés gardent leur prix.
import { createHmac } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { lireVenteGros } from "@/lib/commerce/gros";
import { sortirStock } from "@/lib/stock";

export const TYPES_OFFRE = ["quantite", "case", "apres_achat", "sortie"] as const;
export type TypeOffre = (typeof TYPES_OFFRE)[number];

const palier = z.object({
  quantite: z.number().int().min(2).max(1000),
  prix: z.number().positive().max(100_000_000),
  libelle: z.string().trim().max(60).optional(),
  badge: z.string().trim().max(30).optional(),
});

export const schemaOffre = z.object({
  type: z.enum(TYPES_OFFRE),
  titre: z.string().trim().min(2).max(80),
  texte: z.string().trim().max(240).optional(),
  produitId: z.string().max(40).nullable().optional(),
  produitOffertId: z.string().max(40).nullable().optional(),
  codePromoId: z.string().max(40).nullable().optional(),
  paliers: z.array(palier).max(6).optional(),
  actif: z.boolean().optional(),
}).superRefine((o, ctx) => {
  if (o.type === "quantite") {
    if (!o.produitId) ctx.addIssue({ code: "custom", message: "Choisissez le produit concerné", path: ["produitId"] });
    if (!o.paliers?.length) ctx.addIssue({ code: "custom", message: "Ajoutez au moins un palier", path: ["paliers"] });
    const q = (o.paliers ?? []).map((p) => p.quantite);
    if (new Set(q).size !== q.length) ctx.addIssue({ code: "custom", message: "Deux paliers ont la même quantité", path: ["paliers"] });
  }
  if ((o.type === "case" || o.type === "apres_achat") && !o.produitOffertId) ctx.addIssue({ code: "custom", message: "Choisissez le produit proposé", path: ["produitOffertId"] });
  if (o.type === "sortie" && !o.codePromoId) ctx.addIssue({ code: "custom", message: "Choisissez le code promo proposé", path: ["codePromoId"] });
});
export type Offre = z.infer<typeof schemaOffre>;

/** Prix unitaire d'un palier comparé au prix de base : remise affichée (« −15 % »). */
export const remisePalier = (prixBase: number, prix: number) => (prixBase > 0 && prix < prixBase ? Math.round((1 - prix / prixBase) * 100) : 0);

/** Écrit les paliers dans Produit.venteGros (en gardant minimum, maximum et multiple déjà réglés). */
export async function appliquerPaliers(tenantId: string, produitId: string, paliers: { quantite: number; prix: number }[] | null) {
  const p = await prisma.produit.findFirst({ where: { id: produitId, tenantId }, select: { venteGros: true } });
  if (!p) return;
  const actuel = lireVenteGros(p.venteGros) ?? { paliers: [] };
  await prisma.produit.update({ where: { id: produitId }, data: { venteGros: { ...actuel, paliers: (paliers ?? []).map((x) => ({ min: x.quantite, prix: x.prix })) } } });
}

type ProduitPublic = { id: string; nom: string; prix: number; image: string | null };

/** Offres actives pour une fiche produit, prêtes pour la configuration publique du formulaire. */
export async function offresPourProduit(tenantId: string, produitId: string) {
  const offres = await prisma.offreReleasit.findMany({ where: { tenantId, actif: true, OR: [{ produitId }, { produitId: null }] }, orderBy: { createdAt: "asc" } });
  const ids = [...new Set(offres.map((o) => o.produitOffertId).filter((x): x is string => !!x && x !== produitId))];
  const [produits, codes] = await Promise.all([
    ids.length ? prisma.produit.findMany({ where: { tenantId, id: { in: ids }, actif: true, type: { in: ["physique", "dropshipping"] } }, select: { id: true, nom: true, prix: true, images: true } }) : [],
    prisma.codePromo.findMany({ where: { tenantId, actif: true, id: { in: offres.map((o) => o.codePromoId).filter((x): x is string => !!x) } }, select: { id: true, code: true } }),
  ]);
  const prod = new Map<string, ProduitPublic>(produits.map((p) => [p.id, { id: p.id, nom: p.nom, prix: p.prix, image: p.images[0] ?? null }]));
  const code = new Map(codes.map((c) => [c.id, c.code]));
  const quantite = offres.find((o) => o.type === "quantite" && o.produitId === produitId);
  const apres = offres.find((o) => o.type === "apres_achat" && o.produitOffertId && prod.has(o.produitOffertId));
  const sortie = offres.find((o) => o.type === "sortie" && o.codePromoId && code.has(o.codePromoId));
  return {
    quantite: quantite ? { id: quantite.id, titre: quantite.titre, paliers: (quantite.paliers as Offre["paliers"]) ?? [] } : null,
    cases: offres.filter((o) => o.type === "case" && o.produitOffertId && prod.has(o.produitOffertId)).slice(0, 3).map((o) => ({ id: o.id, titre: o.titre, texte: o.texte, produit: prod.get(o.produitOffertId!)! })),
    apresAchat: apres ? { id: apres.id, titre: apres.titre, texte: apres.texte, produit: prod.get(apres.produitOffertId!)! } : null,
    sortie: sortie ? { id: sortie.id, titre: sortie.titre, texte: sortie.texte, code: code.get(sortie.codePromoId!)! } : null,
  };
}

/** Compte les offres vues ou acceptées (ids venus du navigateur : filtrés sur la boutique). */
export async function compterOffres(tenantId: string, ids: unknown, champ: "vues" | "acceptations") {
  const liste = Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string" && x.length <= 40).slice(0, 10) : [];
  if (!liste.length) return;
  await prisma.offreReleasit.updateMany({ where: { tenantId, id: { in: liste } }, data: { [champ]: { increment: 1 } } });
}

function secret(): string {
  return [process.env.AXSO_CLE_CHIFFREMENT, process.env.AUTH_SECRET, process.env.NEXTAUTH_SECRET].map((s) => s?.trim()).find(Boolean) ?? "axso-dev";
}

/** Jeton remis à l'acheteur avec sa commande : autorise l'ajout en 1 clic pendant 30 minutes. */
export function jetonAjout(commandeId: string, maintenant = Date.now()) {
  const ts = Math.floor(maintenant / 1000).toString(36);
  return `${ts}.${createHmac("sha256", secret()).update(`ajout:${commandeId}:${ts}`).digest("base64url").slice(0, 22)}`;
}
export function jetonAjoutValide(jeton: unknown, commandeId: string, maintenant = Date.now()) {
  if (typeof jeton !== "string" || !/^[0-9a-z]{1,10}\.[A-Za-z0-9_-]{22}$/.test(jeton)) return false;
  const [ts, sig] = jeton.split(".");
  const age = maintenant / 1000 - parseInt(ts, 36);
  return age >= -60 && age <= 30 * 60 && createHmac("sha256", secret()).update(`ajout:${commandeId}:${ts}`).digest("base64url").slice(0, 22) === sig;
}

export class RefusAjout extends Error {}

/** Ajoute le produit de l'offre « après achat » à une commande encore en attente, stock et totaux compris. */
export async function ajouterApresAchat(p: { tenantId: string; commandeId: string; offreId: string }) {
  const offre = await prisma.offreReleasit.findFirst({ where: { id: p.offreId, tenantId: p.tenantId, type: "apres_achat", actif: true } });
  if (!offre?.produitOffertId) throw new RefusAjout("Cette offre n'est plus disponible");
  const produit = await prisma.produit.findFirst({ where: { id: offre.produitOffertId, tenantId: p.tenantId, actif: true, type: { in: ["physique", "dropshipping"] } }, select: { id: true, nom: true, prix: true, images: true } });
  if (!produit) throw new RefusAjout("Ce produit n'est plus disponible");
  const commande = await prisma.$transaction(async (tx) => {
    const c = await tx.commande.findFirst({ where: { id: p.commandeId, tenantId: p.tenantId }, select: { id: true, numero: true, statut: true, montantSousTotal: true, montantTotal: true, lignes: { select: { produitId: true } } } });
    if (!c || c.statut !== "en_attente") throw new RefusAjout("Cette commande ne peut plus être modifiée");
    if (c.lignes.some((l) => l.produitId === produit.id)) throw new RefusAjout("Ce produit est déjà dans votre commande");
    const ligne = await tx.ligneCommande.create({ data: { commandeId: c.id, produitId: produit.id, nom: produit.nom, prix: produit.prix, quantite: 1, imageUrl: produit.images[0] ?? null } });
    await sortirStock(tx, { tenantId: p.tenantId, commandeId: c.id, motif: `Ajout après achat #${c.numero}`, ligneIds: [ligne.id] });
    return tx.commande.update({ where: { id: c.id }, data: { montantSousTotal: c.montantSousTotal + produit.prix, montantTotal: c.montantTotal + produit.prix }, select: { numero: true, montantTotal: true } });
  });
  await prisma.offreReleasit.update({ where: { id: offre.id }, data: { acceptations: { increment: 1 } } });
  return { ...commande, produit: produit.nom };
}
