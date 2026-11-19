// Cartes-cadeaux : émission par le marchand (module « produits », contrôlé par proxy.ts).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { genererCode } from "@/lib/cartes-cadeaux";

const schema = z.object({
  montant: z.coerce.number().positive().max(100_000_000),
  expireLe: z.iso.date().optional().nullable(),
  clientId: z.string().min(1).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const tenantId = (session?.user as any)?.tenantId as string | undefined;
  if (!tenantId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const lu = schema.safeParse(await req.json().catch(() => null));
  if (!lu.success) return NextResponse.json({ error: "Indiquez un montant valide" }, { status: 400 });
  const { montant, expireLe, clientId, note } = lu.data;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { devise: true } });
  if (!tenant) return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  if (clientId && !(await prisma.client.findFirst({ where: { id: clientId, tenantId }, select: { id: true } }))) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  }
  const fin = expireLe ? new Date(`${expireLe}T23:59:59`) : null;
  if (fin && fin <= new Date()) return NextResponse.json({ error: "La date d'expiration doit être dans le futur" }, { status: 400 });

  // Collision de code (31^16 possibilités) : improbable, on retente quand même.
  for (let essai = 0; essai < 3; essai++) {
    const code = genererCode();
    try {
      const carte = await prisma.carteCadeau.create({
        data: { tenantId, code, derniers4: code.slice(-4), montantInitial: montant, solde: montant, devise: tenant.devise, expireLe: fin, clientId: clientId || null, note: note?.trim() || null },
        select: { id: true },
      });
      // Le code complet n'est rendu qu'une fois, à l'émission.
      return NextResponse.json({ id: carte.id, code });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }
  }
  return NextResponse.json({ error: "Réessayez" }, { status: 503 });
}
