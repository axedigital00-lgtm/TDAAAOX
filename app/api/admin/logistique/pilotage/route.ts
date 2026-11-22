// Pilotage : graphe de confiance, économie par ville et versions des modèles.
import { NextResponse } from "next/server";
import { getAdminSessionPour } from "@/lib/admin-auth";
import { refus } from "@/lib/logistique/api";
import { vuePilotage } from "@/lib/logistique/pilotage";

export async function GET() {
  if (!(await getAdminSessionPour("operations"))) return refus(403, "Accès refusé");
  return NextResponse.json(await vuePilotage());
}
