// Jumeau numérique : lecture réservée à la section Opérations.
import { NextResponse } from "next/server";
import { getAdminSessionPour } from "@/lib/admin-auth";
import { refus } from "@/lib/logistique/api";
import { etatJumeau } from "@/lib/logistique/jumeau";

export async function GET() {
  if (!(await getAdminSessionPour("operations"))) return refus(403, "Accès refusé");
  return NextResponse.json(await etatJumeau());
}
