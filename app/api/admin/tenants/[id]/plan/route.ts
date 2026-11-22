import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, estAdminComplet } from "@/lib/admin-auth";
import { changerPlanBoutique, reponseErreur } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/command-center/serveur";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!estAdminComplet(session)) return NextResponse.json({ error: "Lecture seule — action réservée au super-admin" }, { status: 403 });

  const { id } = await params;
  const { plan, jours, paiementRecu, montant, reference } = await req.json().catch(() => ({}));
  const paiement = paiementRecu === true && Number(montant) > 0 && typeof reference === "string" && /^[\w-]{8,80}$/.test(reference)
    ? { montant: Number(montant), reference: `ADM-${id}-${reference}` } : null;
  if (paiementRecu === true && !paiement) return NextResponse.json({ error: "Montant du paiement invalide" }, { status: 400 });
  try {
    const avant = await prisma.tenant.findUnique({ where: { id }, select: { planType: true, planExpiresAt: true } });
    const r = await changerPlanBoutique(id, plan, jours, paiement);
    await journaliser(session, "boutique.plan", "Tenant", id, avant, { ...r, paiement });
    return NextResponse.json({ success: true, ...r });
  } catch (err) {
    return reponseErreur(err);
  }
}
