// Workflows du marchand : liste et création (QUAND → SI → ALORS).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalide, nonAutorise, sessionBoutique } from "@/lib/commerce/api";
import { workflowSchema } from "@/lib/commerce/regles";

const MAX_WORKFLOWS = 30;

export async function GET() {
  const s = await sessionBoutique();
  if (!s) return nonAutorise();
  return NextResponse.json({ workflows: await prisma.workflowBoutique.findMany({ where: { tenantId: s.tenantId }, orderBy: { createdAt: "desc" } }) });
}

export async function POST(req: NextRequest) {
  const s = await sessionBoutique();
  if (!s) return nonAutorise();
  const r = workflowSchema.safeParse(await req.json().catch(() => null));
  if (!r.success) return invalide(r.error);
  if ((await prisma.workflowBoutique.count({ where: { tenantId: s.tenantId } })) >= MAX_WORKFLOWS) return NextResponse.json({ error: `Maximum ${MAX_WORKFLOWS} workflows par boutique` }, { status: 409 });
  return NextResponse.json({ workflow: await prisma.workflowBoutique.create({ data: { ...r.data, tenantId: s.tenantId } }) }, { status: 201 });
}
