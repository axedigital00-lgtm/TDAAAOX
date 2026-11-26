// Releasit COD AXSO — compteurs du formulaire : offres affichées (taux d'acceptation), et affichages /
// ouvertures du formulaire par jour et par variante du test A/B (entonnoir et résultats A/B).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { compterOffres } from "@/lib/commande-express/offres";

const limite = rateLimit({ windowMs: 60_000, max: 30, keyPrefix: "releasit-vues" });

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!limite.check(getClientIp(req)).success) return new NextResponse(null, { status: 204 });
  const t = await prisma.tenant.findUnique({ where: { slug: (await params).slug }, select: { id: true } });
  const b = await req.json().catch(() => null);
  if (!t || !b) return new NextResponse(null, { status: 204 });
  if (b.offres) await compterOffres(t.id, b.offres, "vues").catch(() => {});
  if (b.stat === "affichage" || b.stat === "ouverture") {
    const variante = b.variante === "B" ? "B" : "A";
    const jour = new Date().toISOString().slice(0, 10);
    const champ = b.stat === "affichage" ? "affichages" : "ouvertures";
    await prisma.statReleasitJour.upsert({
      where: { tenantId_jour_variante: { tenantId: t.id, jour, variante } },
      create: { tenantId: t.id, jour, variante, [champ]: 1 }, update: { [champ]: { increment: 1 } },
    }).catch(() => {});
  }
  return new NextResponse(null, { status: 204 });
}
