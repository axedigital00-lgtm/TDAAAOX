// Carte « Affiliés » de Ma boutique : la boutique a-t-elle un programme, combien de
// produits sont ouverts aux affiliés ? POST : confirmation unique des produits cochés
// avant le passage au modèle « le marchand choisit » (oui → programme créé ; non → décochés).
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assurerProgrammeAffiliation } from "@/lib/affiliation";

async function boutique() {
  const session = await auth();
  return ((session?.user as any)?.tenantId as string | undefined) ?? null;
}

export async function GET() {
  const tenantId = await boutique();
  if (!tenantId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const [programme, produitsOuverts] = await Promise.all([
    prisma.programmeAffiliation.findUnique({ where: { tenantId }, select: { id: true } }),
    prisma.produit.count({ where: { tenantId, affiliationActive: true } }),
  ]);
  return NextResponse.json({ programme: !!programme, produitsOuverts });
}

export async function POST(req: NextRequest) {
  const tenantId = await boutique();
  if (!tenantId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { choix } = await req.json().catch(() => ({}));
  if (choix === "oui") await assurerProgrammeAffiliation(tenantId);
  else if (choix === "non") await prisma.produit.updateMany({ where: { tenantId, affiliationActive: true }, data: { affiliationActive: false } });
  else return NextResponse.json({ error: "choix : oui ou non" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
