// Réception GPS : lots horodatés, dédupliqués, acceptés seulement pendant la course.
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { refus, reponseErreur, sessionLogistique } from "@/lib/logistique/api";
import { enregistrerPositions } from "@/lib/logistique/service";

const limite = rateLimit({ windowMs: 60_000, max: 30, keyPrefix: "logistique-gps" });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await sessionLogistique();
  if (!s) return refus();
  const l = limite.check(s.userId);
  if (!l.success) return rateLimitResponse(l.reset);
  const b = await req.json().catch(() => null);
  try {
    return NextResponse.json(await enregistrerPositions(s.userId, (await params).id, b?.points));
  } catch (e) { return reponseErreur(e); }
}
