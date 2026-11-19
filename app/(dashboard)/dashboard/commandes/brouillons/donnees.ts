// Commandes provisoires : prix relus en base (jamais figés), pour la liste et la fiche.
import { prisma } from "@/lib/prisma";
import type { LigneBrouillon } from "@/lib/commandes-provisoires";

export type ProduitBrouillon = { id: string; nom: string; prix: number; image: string | null; stock: number | null; actif: boolean; type: string; variantes: { nom: string; valeur: string; prix: number | null }[] };

/** Produits référencés par des lignes de brouillon (une requête pour toute la page). */
export async function produitsDesLignes(tenantId: string, lignes: LigneBrouillon[]) {
  const ids = [...new Set(lignes.map((l) => l.produitId))];
  if (!ids.length) return new Map<string, ProduitBrouillon>();
  const produits = await prisma.produit.findMany({
    where: { tenantId, id: { in: ids } },
    select: { id: true, nom: true, prix: true, images: true, stock: true, actif: true, type: true, variantes: { where: { actif: true }, select: { nom: true, valeur: true, prix: true } } },
  });
  return new Map(produits.map((p) => [p.id, { ...p, image: p.images[0] ?? null }]));
}

/** Prix unitaire d'une ligne : celui de la variante si elle en a un, sinon celui du produit. */
export function prixLigne(p: ProduitBrouillon | undefined, variante: string | null) {
  if (!p) return 0;
  const v = variante ? p.variantes.find((x) => `${x.nom}: ${x.valeur}` === variante) : null;
  return v?.prix ?? p.prix;
}

export const lignesDe = (json: unknown) => (Array.isArray(json) ? json : []) as LigneBrouillon[];
