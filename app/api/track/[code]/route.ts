// Lien d'affilié : /api/track/CODE (boutique) ou /api/track/CODE?p=PRODUIT (fiche produit).
// Redirige vers la boutique avec ?ref=CODE ; la vitrine mémorise le code 30 jours et compte le clic
// (AffiliationRefCapture → /api/affilie/track-clic), une seule fois par visite.
import { lienBoutique } from "@/lib/origine-site";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const accueil = process.env.NEXT_PUBLIC_APP_URL || "/";
  try {
    const affilie = await prisma.affilie.findUnique({ where: { codeParrainage: code }, select: { tenantId: true, tenant: { select: { slug: true } } } });
    if (!affilie) return NextResponse.redirect(accueil);
    // Le produit doit appartenir à la boutique du lien (sinon : accueil de la boutique).
    const p = request.nextUrl.searchParams.get("p");
    const produit = p ? await prisma.produit.findFirst({ where: { id: p, tenantId: affilie.tenantId, actif: true }, select: { id: true } }) : null;
    const url = new URL(await lienBoutique(affilie.tenant.slug, produit ? `/produits/${produit.id}` : undefined));
    url.searchParams.set("ref", code);
    return NextResponse.redirect(url.toString(), { status: 302 });
  } catch {
    return NextResponse.redirect(accueil);
  }
}
