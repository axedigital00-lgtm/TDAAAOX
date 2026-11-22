// Tournée optimisée du transporteur : ordre des arrêts de ses courses en cours.
import { NextRequest, NextResponse } from "next/server";
import { refus, reponseErreur, sessionLogistique } from "@/lib/logistique/api";
import { peutGerer } from "@/lib/logistique/service";
import { tourneeFournisseur } from "@/lib/logistique/jumeau";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await sessionLogistique();
  if (!s) return refus();
  const { id } = await params;
  if (!(await peutGerer(s.userId, id))) return refus(403, "Accès refusé");
  try { return NextResponse.json(await tourneeFournisseur(id)); } catch (e) { return reponseErreur(e); }
}
