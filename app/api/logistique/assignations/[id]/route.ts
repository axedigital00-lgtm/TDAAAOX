// Réponse d'un fournisseur à une course proposée.
import { NextRequest, NextResponse } from "next/server";
import { limiter, refus, reponseErreur, sessionLogistique } from "@/lib/logistique/api";
import { repondreAssignation } from "@/lib/logistique/service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await sessionLogistique();
  if (!s) return refus();
  const l = limiter(s.userId); if (l) return l;
  const b = await req.json().catch(() => ({}));
  if (typeof b.accepter !== "boolean") return refus(400, "Réponse requise");
  try {
    return NextResponse.json(await repondreAssignation(s.userId, (await params).id, b.accepter, typeof b.motif === "string" ? b.motif.slice(0, 300) : null));
  } catch (e) { return reponseErreur(e); }
}
