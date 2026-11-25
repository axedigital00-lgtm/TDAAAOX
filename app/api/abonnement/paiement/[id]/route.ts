// État d'un paiement d'abonnement, relu chez le prestataire, pour la page d'attente.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appliquerDepot } from "@/lib/paiements/abonnement";
import { clientPawapay } from "@/lib/paiements/pawapay";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;
  const p = await prisma.paiementPawapay.findFirst({ where: { id, userId }, select: { id: true, statut: true } });
  if (!p) return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
  const client = clientPawapay();
  const d = p.statut === "cree" && client ? await client.depot(id).catch(() => null) : null;
  const x = d ? await appliquerDepot(id, d).catch(() => null) : null;
  const statut = x?.statut ?? p.statut;
  // Opérateur à validation dans son application (Wave) : lien à ouvrir.
  return NextResponse.json({ statut, lienAutorisation: statut === "cree" ? d?.lienAutorisation ?? null : null });
}
