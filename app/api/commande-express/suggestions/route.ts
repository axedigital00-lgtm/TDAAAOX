// Releasit COD AXSO — offres recommandées (dashboard), pré-remplies pour l'éditeur d'offres.
import { NextResponse } from "next/server";
import { contexteMarchand } from "@/lib/commande-express/acces";
import { suggererOffres } from "@/lib/commande-express/suggestions";

export async function GET() {
  const c = await contexteMarchand("lecture");
  if ("erreur" in c) return c.erreur;
  return NextResponse.json({ suggestions: await suggererOffres(c.tenantId) });
}
