// Gestion d'un transporteur : flotte, équipe, zones et capacité.
import { NextRequest, NextResponse } from "next/server";
import { limiter, refus, reponseErreur, sessionLogistique } from "@/lib/logistique/api";
import { gererFournisseur, vueGestion } from "@/lib/logistique/service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const s = await sessionLogistique();
  if (!s) return refus();
  try { return NextResponse.json(await vueGestion(s.userId, (await params).id)); } catch (e) { return reponseErreur(e); }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const s = await sessionLogistique();
  if (!s) return refus();
  const l = limiter(s.userId); if (l) return l;
  const b = await req.json().catch(() => null);
  try { return NextResponse.json(await gererFournisseur(s.userId, (await params).id, b)); } catch (e) { return reponseErreur(e); }
}
