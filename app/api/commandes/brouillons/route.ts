import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { donneesBrouillon, marchandCommandes, schemaBrouillon } from "./schema";

// Nouvelle commande provisoire (prise de commande par téléphone / WhatsApp).
export async function POST(req: NextRequest) {
  const m = await marchandCommandes();
  if ("error" in m) return NextResponse.json({ error: m.error }, { status: m.status });
  const saisie = schemaBrouillon.safeParse(await req.json().catch(() => null));
  if (!saisie.success) return NextResponse.json({ error: "Vérifiez le client et les articles saisis" }, { status: 400 });
  if (saisie.data.clientId && !(await prisma.client.findFirst({ where: { id: saisie.data.clientId, tenantId: m.tenantId }, select: { id: true } }))) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  }
  // Numéro suivant de la boutique (#D1, #D2…) ; deux créations simultanées : on retente.
  for (let essai = 0; essai < 3; essai++) {
    const dernier = await prisma.commandeProvisoire.aggregate({ where: { tenantId: m.tenantId }, _max: { numero: true } });
    try {
      const b = await prisma.commandeProvisoire.create({
        data: { tenantId: m.tenantId, numero: (dernier._max.numero ?? 0) + 1, ...donneesBrouillon(saisie.data) },
        select: { id: true },
      });
      return NextResponse.json({ id: b.id });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }
  }
  return NextResponse.json({ error: "Réessayez dans un instant" }, { status: 409 });
}
