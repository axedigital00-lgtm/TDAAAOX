// Accès du dashboard à Releasit COD AXSO : session marchand + droit sur les commandes.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireNiveau } from "@/lib/permissions-server";

export async function contexteMarchand(niveau: "lecture" | "ecriture") {
  const session = await auth();
  const user = session?.user as { id?: string; name?: string | null; tenantId?: string } | undefined;
  if (!session || !user?.tenantId) return { erreur: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  const refus = await requireNiveau(session, "commandes", niveau);
  if (refus) return { erreur: NextResponse.json({ error: refus.error }, { status: refus.status }) };
  return { tenantId: user.tenantId, userId: user.id ?? null, nom: user.name ?? null };
}
