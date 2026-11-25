// Pays où le client peut payer par Mobile Money, avec les moyens de paiement ouverts (lib/paiements/pays-couverts.ts).
import { NextResponse } from "next/server";
import { clientPawapay } from "@/lib/paiements/pawapay";
import { paysCouverts } from "@/lib/paiements/pays-couverts";

export async function GET() {
  if (!clientPawapay()) return NextResponse.json({ disponible: false, pays: [] });
  const pays = await paysCouverts().catch(() => []);
  return NextResponse.json({ disponible: pays.length > 0, pays }, { headers: { "Cache-Control": "public, max-age=300" } });
}
