// Démarre l'achat d'un pack de coins et renvoie la page de paiement Mobile Money.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { demarrerAchat } from "@/lib/ia/achats";
import { ErreurCoins } from "@/lib/ia/coins";

const limite = rateLimit({ windowMs: 60_000, max: 6, keyPrefix: "coins-achat" });

export async function POST(req: NextRequest) {
  const u = (await auth())?.user as { id?: string; tenantId?: string } | undefined;
  if (!u?.id || !u.tenantId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const l = limite.check(u.id);
  if (!l.success) return rateLimitResponse(l.reset);
  const b = await req.json().catch(() => null);
  try { return NextResponse.json(await demarrerAchat({ userId: u.id, tenantId: u.tenantId, pack: String(b?.pack ?? ""), origine: req.nextUrl.origin, telephone: String(b?.telephone ?? "") })); }
  catch (e) {
    if (e instanceof ErreurCoins) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[coins/acheter]", e);
    return NextResponse.json({ error: "Paiement indisponible" }, { status: 500 });
  }
}
