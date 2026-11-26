// Releasit COD AXSO — capture d'un formulaire commencé (nom + téléphone valides), pour relancer le client.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { cleValide } from "@/lib/commande-express/reglages";
import { capturerAbandon } from "@/lib/commande-express/abandons";

const limite = rateLimit({ windowMs: 60_000, max: 10, keyPrefix: "releasit-abandon" });

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!limite.check(getClientIp(req)).success) return new NextResponse(null, { status: 204 });
  const t = await prisma.tenant.findUnique({ where: { slug: (await params).slug }, select: { id: true, statut: true } });
  const b = await req.json().catch(() => null);
  if (!t || t.statut !== "active" || !b || !cleValide(b.cle)) return new NextResponse(null, { status: 204 });
  await capturerAbandon(t.id, b).catch(() => null);
  return new NextResponse(null, { status: 204 });
}
