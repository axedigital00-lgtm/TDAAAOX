// Pays où le client peut payer par Mobile Money : configuration active du compte du prestataire,
// sinon (configuration illisible) la liste des pays couverts.
import { NextResponse } from "next/server";
import { clientPawapay, PAYS_PAWAPAY, paysPawapay } from "@/lib/paiements/pawapay";

export async function GET() {
  const client = clientPawapay();
  if (!client) return NextResponse.json({ disponible: false, pays: [] });
  const actifs = await client.configuration("DEPOSIT").catch(() => []);
  const iso3Actifs = new Set(actifs.map((a) => a.pays));
  const pays = PAYS_PAWAPAY.filter((c) => !actifs.length || iso3Actifs.has(paysPawapay(c)!.iso3)).map((c) => ({
    code: c, devise: paysPawapay(c)!.devise,
    operateurs: [...new Set(actifs.find((a) => a.pays === paysPawapay(c)!.iso3)?.operateurs.filter((o) => o.ouvert).map((o) => o.nom) ?? [])],
  }));
  return NextResponse.json({ disponible: true, pays }, { headers: { "Cache-Control": "public, max-age=300" } });
}
