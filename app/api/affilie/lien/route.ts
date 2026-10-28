// Lien d'affiliation du compte connecté, vers une boutique ou un produit précis.
// Le partenariat avec la boutique est créé à la première demande (actif ou en attente de validation).
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assurerPartenariat, lienAffiliation } from "@/lib/affiliation";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Connectez-vous pour obtenir votre lien" }, { status: 401 });

  const { produitId, tenantId: tenantDemande } = await req.json().catch(() => ({}));
  let tenantId = typeof tenantDemande === "string" ? tenantDemande : null;
  if (typeof produitId === "string") {
    const produit = await prisma.produit.findFirst({ where: { id: produitId, actif: true }, select: { tenantId: true, affiliationActive: true } });
    if (!produit?.affiliationActive) return NextResponse.json({ error: "Ce produit n'est pas ouvert aux affiliés" }, { status: 400 });
    tenantId = produit.tenantId;
  }
  if (!tenantId) return NextResponse.json({ error: "Produit ou boutique requis" }, { status: 400 });

  try {
    const p = await assurerPartenariat(userId, tenantId);
    return NextResponse.json({ lien: lienAffiliation(p.codeParrainage, typeof produitId === "string" ? produitId : null), code: p.codeParrainage, statut: p.statut });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 400 });
  }
}
