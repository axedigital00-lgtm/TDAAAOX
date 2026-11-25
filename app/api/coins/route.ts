// Solde de coins, historique et tarifs pour la boutique connectée.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { soldeCoins } from "@/lib/ia/coins";
import { ACTIONS, COIN_FCFA, COINS_BIENVENUE, COINS_MENSUELS, PACKS } from "@/lib/ia/coins-regles";
import { openaiConfigure } from "@/lib/ia/openai";
import { synchroniserAchatsEnAttente } from "@/lib/ia/achats";
import { clientPawapay } from "@/lib/paiements/pawapay";

export async function GET() {
  const tenantId = (await auth())?.user && ((await auth())!.user as { tenantId?: string }).tenantId;
  if (!tenantId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const lienAutorisation = await synchroniserAchatsEnAttente(tenantId).catch(() => null);
  const [solde, historique] = await Promise.all([
    soldeCoins(tenantId),
    prisma.ecritureCoins.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 40, select: { id: true, type: true, source: true, montant: true, action: true, motif: true, createdAt: true } }),
  ]);
  return NextResponse.json({ solde, historique, actions: ACTIONS, packs: PACKS, coinFcfa: COIN_FCFA, inclus: { bienvenue: COINS_BIENVENUE, mensuels: COINS_MENSUELS }, achatOuvert: !!clientPawapay(), achatTest: !(process.env.PAWAPAY_API_URL ?? "").includes("api.pawapay.io"), lienAutorisation, actionsDisponibles: openaiConfigure() });
}
