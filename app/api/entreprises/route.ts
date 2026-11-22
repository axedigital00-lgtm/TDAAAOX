// Comptes entreprises : conditions de paiement, remise, plafond et lien privé de commande rapide.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lienBoutique } from "@/lib/origine-site";
import { invalide, nonAutorise, sessionBoutique } from "@/lib/commerce/api";
import { jeton } from "@/lib/commerce/devis";
import { METHODE_A_TERME, entrepriseSchema } from "@/lib/commerce/regles";

export async function GET() {
  const s = await sessionBoutique();
  if (!s) return nonAutorise();
  const [liste, tenant, dus] = await Promise.all([
    prisma.compteEntreprise.findMany({ where: { tenantId: s.tenantId }, orderBy: { createdAt: "desc" } }),
    prisma.tenant.findUniqueOrThrow({ where: { id: s.tenantId }, select: { slug: true, devise: true } }),
    prisma.commande.groupBy({ by: ["compteEntrepriseId"], where: { tenantId: s.tenantId, compteEntrepriseId: { not: null }, methodePaiement: METHODE_A_TERME, paiementStatut: "pending", statut: { not: "annulee" } }, _sum: { montantTotal: true } }),
  ]);
  const entreprises = await Promise.all(liste.map(async (e) => ({
    ...e, lien: await lienBoutique(tenant.slug, `/pro/${e.token}`),
    encours: dus.find((x) => x.compteEntrepriseId === e.id)?._sum.montantTotal ?? 0,
  })));
  return NextResponse.json({ entreprises, devise: tenant.devise });
}

export async function POST(req: NextRequest) {
  const s = await sessionBoutique();
  if (!s) return nonAutorise();
  const r = entrepriseSchema.safeParse(await req.json().catch(() => null));
  if (!r.success) return invalide(r.error);
  const entreprise = await prisma.compteEntreprise.create({ data: { ...r.data, tenantId: s.tenantId, token: jeton() } });
  return NextResponse.json({ entreprise }, { status: 201 });
}
