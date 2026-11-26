// Offres Releasit COD AXSO (dashboard) : liste avec chiffres, création, modification, suppression.
// Les paliers de quantité sont aussi écrits dans Produit.venteGros : la création de commande les applique.
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { contexteMarchand } from "@/lib/commande-express/acces";
import { appliquerPaliers, schemaOffre } from "@/lib/commande-express/offres";

export async function GET() {
  const c = await contexteMarchand("lecture");
  if ("erreur" in c) return c.erreur;
  const [offres, produits, codes, tenant] = await Promise.all([
    prisma.offreReleasit.findMany({ where: { tenantId: c.tenantId }, orderBy: { createdAt: "desc" } }),
    prisma.produit.findMany({ where: { tenantId: c.tenantId, actif: true, type: { in: ["physique", "dropshipping"] } }, select: { id: true, nom: true, prix: true, images: true }, orderBy: { nom: "asc" }, take: 500 }),
    prisma.codePromo.findMany({ where: { tenantId: c.tenantId, actif: true }, select: { id: true, code: true }, orderBy: { code: "asc" }, take: 200 }),
    prisma.tenant.findUnique({ where: { id: c.tenantId }, select: { devise: true } }),
  ]);
  return NextResponse.json({ offres, produits: produits.map((p) => ({ id: p.id, nom: p.nom, prix: p.prix, image: p.images[0] ?? null })), codes, devise: tenant?.devise ?? "XAF" });
}

/** Produits et code promo référencés : doivent appartenir à la boutique. */
async function referencesValides(tenantId: string, o: { produitId?: string | null; produitOffertId?: string | null; codePromoId?: string | null }) {
  const ids = [o.produitId, o.produitOffertId].filter((x): x is string => !!x);
  if (ids.length && (await prisma.produit.count({ where: { tenantId, id: { in: ids } } })) !== new Set(ids).size) return false;
  if (o.codePromoId && !(await prisma.codePromo.count({ where: { tenantId, id: o.codePromoId } }))) return false;
  return true;
}

export async function POST(req: NextRequest) {
  const c = await contexteMarchand("ecriture");
  if ("erreur" in c) return c.erreur;
  const lu = schemaOffre.safeParse(await req.json().catch(() => ({})));
  if (!lu.success) return NextResponse.json({ error: lu.error.issues[0]?.message ?? "Données invalides" }, { status: 400 });
  const o = lu.data;
  if (!(await referencesValides(c.tenantId, o))) return NextResponse.json({ error: "Produit ou code introuvable" }, { status: 400 });
  if (o.type === "quantite" && (await prisma.offreReleasit.count({ where: { tenantId: c.tenantId, type: "quantite", produitId: o.produitId } }))) {
    return NextResponse.json({ error: "Ce produit a déjà une offre de quantité : modifiez-la" }, { status: 409 });
  }
  const offre = await prisma.offreReleasit.create({
    data: { tenantId: c.tenantId, type: o.type, titre: o.titre, texte: o.texte, produitId: o.produitId ?? null, produitOffertId: o.produitOffertId ?? null, codePromoId: o.codePromoId ?? null, paliers: (o.paliers ?? Prisma.JsonNull) as Prisma.InputJsonValue, actif: o.actif ?? true },
  });
  if (o.type === "quantite" && o.produitId && offre.actif) await appliquerPaliers(c.tenantId, o.produitId, o.paliers ?? []);
  return NextResponse.json({ offre });
}

export async function PATCH(req: NextRequest) {
  const c = await contexteMarchand("ecriture");
  if ("erreur" in c) return c.erreur;
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const avant = await prisma.offreReleasit.findFirst({ where: { id, tenantId: c.tenantId } });
  if (!avant) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
  const lu = schemaOffre.safeParse({ ...avant, texte: avant.texte ?? undefined, paliers: avant.paliers ?? undefined, ...(await req.json().catch(() => ({}))), type: avant.type });
  if (!lu.success) return NextResponse.json({ error: lu.error.issues[0]?.message ?? "Données invalides" }, { status: 400 });
  const o = lu.data;
  if (!(await referencesValides(c.tenantId, o))) return NextResponse.json({ error: "Produit ou code introuvable" }, { status: 400 });
  const offre = await prisma.offreReleasit.update({
    where: { id },
    data: { titre: o.titre, texte: o.texte ?? null, produitId: o.produitId ?? null, produitOffertId: o.produitOffertId ?? null, codePromoId: o.codePromoId ?? null, paliers: (o.paliers ?? Prisma.JsonNull) as Prisma.InputJsonValue, actif: o.actif ?? avant.actif },
  });
  // Paliers en vigueur seulement si l'offre est active ; désactivée, le produit revient à son prix unique.
  if (offre.type === "quantite" && offre.produitId) await appliquerPaliers(c.tenantId, offre.produitId, offre.actif ? o.paliers ?? [] : null);
  return NextResponse.json({ offre });
}

export async function DELETE(req: NextRequest) {
  const c = await contexteMarchand("ecriture");
  if ("erreur" in c) return c.erreur;
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const offre = await prisma.offreReleasit.findFirst({ where: { id, tenantId: c.tenantId } });
  if (!offre) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
  await prisma.offreReleasit.delete({ where: { id } });
  if (offre.type === "quantite" && offre.produitId) await appliquerPaliers(c.tenantId, offre.produitId, null);
  return NextResponse.json({ ok: true });
}
