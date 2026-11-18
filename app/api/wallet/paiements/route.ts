// Onglet « Paiements reçus » de Mon argent : paiements des commandes et commissions Axso
// (reprend l'ancienne page /dashboard/paiements, sans son solde en doublon). Module « finance » requis.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireNiveau } from "@/lib/permissions-server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const refus = await requireNiveau(session, "finance", "lecture");
  if (refus) return NextResponse.json({ error: refus.error }, { status: refus.status });
  const tenantId = (session.user as any)?.tenantId;
  if (!tenantId) return NextResponse.json({ commandes: [], commissions: [] });

  const [commandes, commissions] = await Promise.all([
    prisma.commande.findMany({
      where: { tenantId },
      select: { id: true, numero: true, clientNom: true, montantTotal: true, methodePaiement: true, paiementStatut: true, createdAt: true, client: { select: { nom: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.commission.findMany({
      where: { tenantId },
      select: { id: true, montantCommande: true, montantCommission: true, montantMarchand: true, devise: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);
  return NextResponse.json({ commandes, commissions });
}
