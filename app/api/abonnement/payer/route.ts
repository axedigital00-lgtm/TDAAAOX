// Démarre le paiement Mobile Money d'un forfait : demande envoyée sur le téléphone du marchand.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { demarrerPaiementAbonnement, ErreurPaiement } from "@/lib/paiements/abonnement";

const limite = rateLimit({ windowMs: 60_000, max: 6, keyPrefix: "abonnement-payer" });

export async function POST(req: NextRequest) {
  const session = await auth();
  const u = session?.user as { id?: string; tenantId?: string } | undefined;
  if (!u?.id || !u.tenantId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const l = limite.check(u.id);
  if (!l.success) return rateLimitResponse(l.reset);
  const b = await req.json().catch(() => null);
  try {
    return NextResponse.json(await demarrerPaiementAbonnement({ userId: u.id, tenantId: u.tenantId, plan: String(b?.plan ?? ""), origine: req.nextUrl.origin, telephone: String(b?.telephone ?? "") }));
  } catch (e) {
    if (e instanceof ErreurPaiement) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[abonnement/payer]", e);
    return NextResponse.json({ error: "Paiement indisponible" }, { status: 500 });
  }
}
