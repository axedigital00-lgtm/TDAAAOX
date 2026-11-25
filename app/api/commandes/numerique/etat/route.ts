// État d'un paiement de produit numérique, pour la page de retour du client.
// L'identifiant est l'UUID du dépôt pawaPay (non devinable) ; le statut est relu chez pawaPay.
import { NextRequest, NextResponse } from "next/server";
import { etatPaiementCommande } from "@/lib/paiements/commande-numerique";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!UUID.test(id)) return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
  const etat = await etatPaiementCommande(id).catch(() => null);
  return etat ? NextResponse.json(etat) : NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
}
