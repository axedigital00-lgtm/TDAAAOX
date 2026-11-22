// Un workflow : modification, activation, suppression.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { introuvable, invalide, nonAutorise, sessionBoutique } from "@/lib/commerce/api";
import { workflowSchema } from "@/lib/commerce/regles";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const s = await sessionBoutique();
  if (!s) return nonAutorise();
  const id = (await params).id;
  const corps = await req.json().catch(() => null);
  if (corps && Object.keys(corps).length === 1 && typeof corps.actif === "boolean") {
    const { count } = await prisma.workflowBoutique.updateMany({ where: { id, tenantId: s.tenantId }, data: { actif: corps.actif } });
    return count ? NextResponse.json({ ok: true }) : introuvable();
  }
  const r = workflowSchema.safeParse(corps);
  if (!r.success) return invalide(r.error);
  const { count } = await prisma.workflowBoutique.updateMany({ where: { id, tenantId: s.tenantId }, data: r.data });
  return count ? NextResponse.json({ ok: true }) : introuvable();
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const s = await sessionBoutique();
  if (!s) return nonAutorise();
  const { count } = await prisma.workflowBoutique.deleteMany({ where: { id: (await params).id, tenantId: s.tenantId } });
  return count ? NextResponse.json({ ok: true }) : introuvable();
}
