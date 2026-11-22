// Vente aux grossistes d'un produit : prix dégressifs et règles de quantité (lib/commerce/gros.ts).
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { venteGrosSchema } from "@/lib/commerce/gros";

type Ctx = { params: Promise<{ id: string }> };

async function produitDuMarchand(id: string) {
  const tenantId = ((await auth())?.user as { tenantId?: string } | undefined)?.tenantId;
  if (!tenantId) return null;
  return prisma.produit.findFirst({ where: { id, tenantId }, select: { id: true, nom: true, prix: true, type: true, venteGros: true } });
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const p = await produitDuMarchand((await params).id);
  return p ? NextResponse.json({ produit: p }) : NextResponse.json({ error: "Introuvable" }, { status: 404 });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const p = await produitDuMarchand((await params).id);
  if (!p) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const corps = await req.json().catch(() => null);
  if (corps === null || corps?.desactiver) {
    await prisma.produit.update({ where: { id: p.id }, data: { venteGros: Prisma.DbNull } });
    return NextResponse.json({ venteGros: null });
  }
  const r = venteGrosSchema.safeParse(corps);
  if (!r.success) return NextResponse.json({ error: r.error.issues[0]?.message ?? "Données invalides" }, { status: 400 });
  if (r.data.paliers.some((x) => x.prix >= p.prix)) return NextResponse.json({ error: "Chaque palier doit être moins cher que le prix normal" }, { status: 400 });
  await prisma.produit.update({ where: { id: p.id }, data: { venteGros: r.data } });
  return NextResponse.json({ venteGros: r.data });
}
