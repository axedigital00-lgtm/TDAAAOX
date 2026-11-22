// Lancements planifiés : liste, création à partir du brouillon, annulation avant publication.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lireBrouillon } from "@/lib/builder/moteur";
import { invalide, nonAutorise, sessionBoutique } from "@/lib/commerce/api";
import { creerLancement } from "@/lib/commerce/lancements";
import { lancementSchema } from "@/lib/commerce/regles";

export async function GET() {
  const s = await sessionBoutique();
  if (!s) return nonAutorise();
  const [lancements, b] = await Promise.all([
    prisma.lancementBoutique.findMany({ where: { tenantId: s.tenantId }, orderBy: { debut: "desc" }, take: 50, omit: { config: true } }),
    lireBrouillon(s.tenantId),
  ]);
  return NextResponse.json({ lancements, brouillon: b.existe });
}

export async function POST(req: NextRequest) {
  const s = await sessionBoutique();
  if (!s) return nonAutorise();
  const r = lancementSchema.safeParse(await req.json().catch(() => null));
  if (!r.success) return invalide(r.error);
  const c = await creerLancement(s.tenantId, s.userId, r.data);
  return c.erreur ? NextResponse.json({ error: c.erreur }, { status: 409 }) : NextResponse.json({ lancement: { id: c.lancement!.id } }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const s = await sessionBoutique();
  if (!s) return nonAutorise();
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const { count } = await prisma.lancementBoutique.updateMany({ where: { id, tenantId: s.tenantId, statut: "planifie" }, data: { statut: "annule" } });
  return count ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Ce lancement ne peut plus être annulé" }, { status: 409 });
}
