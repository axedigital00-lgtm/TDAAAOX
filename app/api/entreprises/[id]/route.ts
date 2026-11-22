// Un compte entreprise : modification, ou nouveau lien privé (l'ancien cesse de fonctionner).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { introuvable, invalide, nonAutorise, sessionBoutique } from "@/lib/commerce/api";
import { jeton } from "@/lib/commerce/devis";
import { entrepriseSchema } from "@/lib/commerce/regles";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await sessionBoutique();
  if (!s) return nonAutorise();
  const id = (await params).id;
  const corps = await req.json().catch(() => null);
  if (corps?.nouveauLien === true) {
    const { count } = await prisma.compteEntreprise.updateMany({ where: { id, tenantId: s.tenantId }, data: { token: jeton() } });
    return count ? NextResponse.json({ ok: true }) : introuvable();
  }
  const r = entrepriseSchema.safeParse(corps);
  if (!r.success) return invalide(r.error);
  const { count } = await prisma.compteEntreprise.updateMany({ where: { id, tenantId: s.tenantId }, data: r.data });
  return count ? NextResponse.json({ ok: true }) : introuvable();
}
