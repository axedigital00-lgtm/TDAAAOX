// Marchés de la boutique : pays ouverts, devise affichée, ajustement et arrondi (lib/commerce/marches.ts).
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lireMarches, marchesSchema } from "@/lib/commerce/marches";

async function tenantId() {
  return ((await auth())?.user as { tenantId?: string } | undefined)?.tenantId ?? null;
}

export async function GET() {
  const id = await tenantId();
  if (!id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const t = await prisma.tenant.findUnique({ where: { id }, select: { pays: true, devise: true, marches: true } });
  if (!t) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  return NextResponse.json({ pays: t.pays, devise: t.devise, marches: lireMarches(t.marches) });
}

export async function PUT(req: NextRequest) {
  const id = await tenantId();
  if (!id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const r = marchesSchema.safeParse((await req.json().catch(() => null))?.marches);
  if (!r.success) return NextResponse.json({ error: r.error.issues[0]?.message ?? "Données invalides" }, { status: 400 });
  await prisma.tenant.update({ where: { id }, data: { marches: r.data } });
  return NextResponse.json({ marches: r.data });
}
