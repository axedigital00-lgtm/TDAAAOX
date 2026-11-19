// Carte-cadeau : désactiver / réactiver, modifier la note ou l'expiration.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const schema = z.object({
  active: z.boolean().optional(),
  note: z.string().max(500).optional().nullable(),
  expireLe: z.iso.date().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const tenantId = (session?.user as any)?.tenantId as string | undefined;
  if (!tenantId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const { id } = await params;

  const lu = schema.safeParse(await req.json().catch(() => null));
  if (!lu.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  const { active, note, expireLe } = lu.data;

  const { count } = await prisma.carteCadeau.updateMany({
    where: { id, tenantId },
    data: {
      ...(active !== undefined ? { desactiveeLe: active ? null : new Date() } : {}),
      ...(note !== undefined ? { note: note?.trim() || null } : {}),
      ...(expireLe !== undefined ? { expireLe: expireLe ? new Date(`${expireLe}T23:59:59`) : null } : {}),
    },
  });
  if (!count) return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
