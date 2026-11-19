// Vitrine : vérifier une carte-cadeau avant de commander (estimation affichée ; le débit réel
// se fait à la création de la commande). Limité par IP et par boutique contre la force brute,
// et une seule réponse pour « inconnue », « épuisée », « expirée » ou « désactivée ».
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { etatCarte, normaliserCode, LONGUEUR_CODE, limiteCarteCadeau } from "@/lib/cartes-cadeaux";

export async function POST(req: NextRequest) {
  const { tenantId, code } = await req.json().catch(() => ({}));
  if (!tenantId || !code) return NextResponse.json({ error: "Saisissez le code de la carte" }, { status: 400 });
  const rl = limiteCarteCadeau.check(`${getClientIp(req)}:${tenantId}`);
  if (!rl.success) return rateLimitResponse(rl.reset);

  const c = normaliserCode(code);
  const carte = c.length === LONGUEUR_CODE
    ? await prisma.carteCadeau.findUnique({ where: { tenantId_code: { tenantId: String(tenantId), code: c } }, select: { solde: true, devise: true, derniers4: true, expireLe: true, desactiveeLe: true } })
    : null;
  if (!carte || etatCarte(carte) !== "active") return NextResponse.json({ error: "Carte-cadeau invalide, épuisée ou expirée" }, { status: 404 });
  return NextResponse.json({ solde: carte.solde, devise: carte.devise, derniers4: carte.derniers4 });
}
