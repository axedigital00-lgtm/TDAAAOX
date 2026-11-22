// Portail transporteur : mes profils (GET) et inscription d'une société ou d'un livreur (POST).
import { NextRequest, NextResponse } from "next/server";
import { limiter, refus, reponseErreur, sessionLogistique } from "@/lib/logistique/api";
import { creerFournisseur, fournisseursDe } from "@/lib/logistique/service";

export async function GET() {
  const s = await sessionLogistique();
  if (!s) return refus();
  const liste = await fournisseursDe(s.userId);
  return NextResponse.json({ fournisseurs: liste.map(({ reglement, ...f }) => ({ ...f, reglementRenseigne: !!reglement })) });
}

export async function POST(req: NextRequest) {
  const s = await sessionLogistique();
  if (!s) return refus();
  const l = limiter(s.userId); if (l) return l;
  try {
    const f = await creerFournisseur(s.userId, await req.json().catch(() => null));
    return NextResponse.json({ id: f.id }, { status: 201 });
  } catch (e) { return reponseErreur(e); }
}
