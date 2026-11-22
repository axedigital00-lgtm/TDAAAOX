import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { lirePosition, STATUT_EN_ROUTE } from "@/lib/logistique/position";

// L'appli envoie au plus un point toutes les 5 s, plus un filet de sécurité.
const limite = rateLimit({ windowMs: 60_000, max: 40, keyPrefix: "position-livreur" });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const userId = (session.user as any)?.id;
  const livreur = await prisma.livreur.findUnique({ where: { id }, select: { id: true, userId: true } });
  if (!livreur || livreur.userId !== userId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const rl = limite.check(id);
  if (!rl.success) return rateLimitResponse(rl.reset);

  const corps = await req.json().catch(() => null);
  const position = lirePosition(corps?.latitude, corps?.longitude);
  if (!position) return NextResponse.json({ error: "Position invalide" }, { status: 400 });

  // Hors course, rien n'est conservé : un livreur n'est jamais suivi quand il ne livre pas.
  const now = new Date();
  const { count } = await prisma.commande.updateMany({
    where: { livreurId: id, statut: STATUT_EN_ROUTE },
    data: { livreurPosition: { lat: position.lat, lng: position.lng, updatedAt: now.toISOString() } },
  });
  if (!count) return NextResponse.json({ success: true, ignoree: true });

  await prisma.livreur.update({ where: { id }, data: { latitude: position.lat, longitude: position.lng, positionAt: now } });
  return NextResponse.json({ success: true });
}
