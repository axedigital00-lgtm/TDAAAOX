// Commandes brouillons et devis du marchand : liste et création. Totaux toujours recalculés ici.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalide, nonAutorise, reponseErreur, sessionBoutique } from "@/lib/commerce/api";
import { jeton, numeroDevis } from "@/lib/commerce/devis";
import { devisSchema, totauxDevis } from "@/lib/commerce/regles";

export async function GET() {
  const s = await sessionBoutique();
  if (!s) return nonAutorise();
  const devis = await prisma.devis.findMany({ where: { tenantId: s.tenantId }, orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({ devis });
}

export async function POST(req: NextRequest) {
  const s = await sessionBoutique();
  if (!s) return nonAutorise();
  const r = devisSchema.safeParse(await req.json().catch(() => null));
  if (!r.success) return invalide(r.error);
  try {
    const d = r.data;
    if (d.entrepriseId && !(await prisma.compteEntreprise.findFirst({ where: { id: d.entrepriseId, tenantId: s.tenantId }, select: { id: true } }))) return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404 });
    const ids = [...new Set(d.lignes.map((l) => l.produitId))];
    const connus = await prisma.produit.count({ where: { id: { in: ids }, tenantId: s.tenantId, type: "physique" } });
    if (connus !== ids.length) return NextResponse.json({ error: "Un produit n'appartient pas à cette boutique" }, { status: 400 });
    const t = totauxDevis(d.lignes, d.remise, d.livraison);
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: s.tenantId }, select: { devise: true } });
    const devis = await prisma.devis.create({ data: { ...d, tenantId: s.tenantId, numero: numeroDevis(), token: jeton(), remise: t.reduction, livraison: t.livraison, total: t.total, devise: tenant.devise, lignes: d.lignes } });
    return NextResponse.json({ devis }, { status: 201 });
  } catch (e) { return reponseErreur(e); }
}
