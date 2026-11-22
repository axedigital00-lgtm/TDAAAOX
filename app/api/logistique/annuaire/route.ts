// Annuaire public des transporteurs : aucune donnée personnelle ni document.
import { NextRequest, NextResponse } from "next/server";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { annuaire } from "@/lib/logistique/vues";

export async function GET(req: NextRequest) {
  const r = apiLimiter.check(`annuaire:${getClientIp(req)}`);
  if (!r.success) return rateLimitResponse(r.reset);
  return NextResponse.json({ fournisseurs: await annuaire(req.nextUrl.searchParams.get("ville")?.slice(0, 80)) });
}
