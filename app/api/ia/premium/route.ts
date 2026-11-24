// Lance une action IA premium payée en coins.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { lancerActionPremium } from "@/lib/ia/actions-premium";
import { ErreurCoins } from "@/lib/ia/coins";
import { ACTIONS, type ActionPremium } from "@/lib/ia/coins-regles";

const limite = rateLimit({ windowMs: 60_000, max: 5, keyPrefix: "ia-premium" });

export async function POST(req: NextRequest) {
  const u = (await auth())?.user as { id?: string; tenantId?: string } | undefined;
  if (!u?.id || !u.tenantId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const l = limite.check(u.tenantId);
  if (!l.success) return rateLimitResponse(l.reset);
  const b = await req.json().catch(() => null);
  const action = String(b?.action ?? "") as ActionPremium;
  if (!(action in ACTIONS)) return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  try { return NextResponse.json(await lancerActionPremium(u.tenantId, action, String(b?.brief ?? ""))); }
  catch (e) {
    if (e instanceof ErreurCoins) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[api/ia/premium]", e);
    return NextResponse.json({ error: "Action indisponible" }, { status: 500 });
  }
}
