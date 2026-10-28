// Réglages d'affiliation de la boutique connectée (un programme par boutique).
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assurerProgrammeAffiliation } from "@/lib/affiliation";

const SELECT = { id: true, actif: true, valeurCommission: true, autoApprobation: true } as const;

async function tenantDeSession() {
  const session = await auth();
  if (!session) return { erreur: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  const tenantId = (session.user as any)?.tenantId as string | undefined;
  if (!tenantId) return { erreur: NextResponse.json({ error: "Pas de boutique" }, { status: 400 }) };
  return { tenantId };
}

// GET — programme (ou null) et nombre de produits ouverts aux affiliés
export async function GET() {
  const { tenantId, erreur } = await tenantDeSession();
  if (erreur) return erreur;
  const [programme, produitsOuverts] = await Promise.all([
    prisma.programmeAffiliation.findUnique({ where: { tenantId }, select: SELECT }),
    prisma.produit.count({ where: { tenantId, actif: true, affiliationActive: true } }),
  ]);
  return NextResponse.json({ programme, produitsOuverts });
}

// PATCH — { actif?, valeurCommission?, autoApprobation? } ; crée le programme s'il n'existe pas
export async function PATCH(req: NextRequest) {
  const { tenantId, erreur } = await tenantDeSession();
  if (erreur) return erreur;
  const body = await req.json().catch(() => ({}));
  const data: { actif?: boolean; valeurCommission?: number; autoApprobation?: boolean } = {};
  if (typeof body.actif === "boolean") data.actif = body.actif;
  if (typeof body.autoApprobation === "boolean") data.autoApprobation = body.autoApprobation;
  if (body.valeurCommission !== undefined) {
    const v = Number(body.valeurCommission);
    if (!Number.isFinite(v)) return NextResponse.json({ error: "Taux invalide" }, { status: 400 });
    data.valeurCommission = Math.min(90, Math.max(1, v));
  }
  await assurerProgrammeAffiliation(tenantId);
  const programme = await prisma.programmeAffiliation.update({ where: { tenantId }, data, select: SELECT });
  return NextResponse.json({ programme });
}
