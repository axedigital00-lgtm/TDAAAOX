// Ventes apportées par les affiliés de la boutique connectée (200 dernières commissions).
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { etatCommission } from "@/lib/affiliation-regles";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const tenantId = (session.user as any)?.tenantId as string | undefined;
  if (!tenantId) return NextResponse.json({ error: "Pas de boutique" }, { status: 400 });

  const comms = await prisma.commissionAffilie.findMany({
    where: { tenantId },
    include: { affilie: { select: { nom: true, codeParrainage: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const ids = comms.map((c) => c.commandeId).filter((x): x is string => !!x);
  const commandes = new Map(
    (await prisma.commande.findMany({ where: { id: { in: ids }, tenantId }, select: { id: true, numero: true, statut: true, livreeAt: true } })).map((c) => [c.id, c]),
  );
  const maintenant = new Date();
  const commissions = comms.map((c) => {
    const cmd = c.commandeId ? commandes.get(c.commandeId) : null;
    return {
      id: c.id, createdAt: c.createdAt, numero: cmd?.numero ?? null, affilie: c.affilie.nom, code: c.affilie.codeParrainage,
      valeurCommande: c.valeurCommande, montant: c.montantCommission, devise: c.devise, etat: etatCommission(c, cmd, maintenant),
    };
  });
  return NextResponse.json({ commissions });
}
