// Console d'un fournisseur : activité (GET), disponibilité et tarif (PATCH).
import { NextRequest, NextResponse } from "next/server";
import { limiter, refus, reponseErreur, sessionLogistique } from "@/lib/logistique/api";
import { majDisponibilite, peutGerer, publierTarif } from "@/lib/logistique/service";
import { vueFournisseur } from "@/lib/logistique/vues";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const s = await sessionLogistique();
  if (!s) return refus();
  const { id } = await params;
  if (!(await peutGerer(s.userId, id))) return refus(403, "Accès refusé");
  return NextResponse.json(await vueFournisseur(id));
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const s = await sessionLogistique();
  if (!s) return refus();
  const l = limiter(s.userId); if (l) return l;
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  try {
    if (typeof b.disponible === "boolean") await majDisponibilite(s.userId, id, b.disponible);
    else if (b.tarif) await publierTarif(s.userId, id, b.tarif);
    else return refus(400, "Action inconnue");
    return NextResponse.json({ ok: true });
  } catch (e) { return reponseErreur(e); }
}
