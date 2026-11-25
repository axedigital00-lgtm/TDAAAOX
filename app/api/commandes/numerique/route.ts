// Achat d'un produit numérique sur la vitrine : crée la commande et renvoie la page de paiement pawaPay.
// Prix, remise et devise relus en base (lib/paiements/commande-numerique.ts) : jamais ceux du navigateur.
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { creerCommandeNumerique, ErreurVente } from "@/lib/paiements/commande-numerique";

const limite = rateLimit({ windowMs: 60_000, max: 8, keyPrefix: "commande-numerique" });

export async function POST(req: NextRequest) {
  const l = limite.check(getClientIp(req));
  if (!l.success) return rateLimitResponse(l.reset);
  const b = await req.json().catch(() => null);
  if (!b?.tenantId || !b?.produitId || !b?.client) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
  try {
    return NextResponse.json(await creerCommandeNumerique({
      tenantId: String(b.tenantId), produitId: String(b.produitId), codePromo: b.codePromo ? String(b.codePromo) : null,
      codeAffiliation: b.codeAffiliation ? String(b.codeAffiliation) : null,
      client: { nom: String(b.client.nom ?? ""), email: String(b.client.email ?? ""), telephone: String(b.client.telephone ?? ""), pays: String(b.client.pays ?? "") },
      origine: req.nextUrl.origin,
    }));
  } catch (e) {
    if (e instanceof ErreurVente) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[commandes/numerique]", e);
    return NextResponse.json({ error: "Paiement indisponible pour le moment" }, { status: 500 });
  }
}
