// Rappels pawaPay (dépôts et versements, une seule adresse pour tous les types d'opération).
// Simple signal : le contenu n'est jamais cru, le statut est toujours relu chez pawaPay.
// Répond 200 dans tous les cas : pawaPay renvoie sinon le rappel jusqu'à 8 fois ; la tâche
// planifiée rattrape de toute façon un paiement ou un versement resté en attente.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { idRappel } from "@/lib/paiements/pawapay";
import { synchroniserPaiement } from "@/lib/paiements/abonnement";
import { synchroniserVersement } from "@/lib/paiements/versements-marchands";
import { synchroniserAchat } from "@/lib/ia/achats";

export async function POST(req: NextRequest) {
  const { depot, versement } = idRappel(await req.json().catch(() => null));
  if (depot && (await prisma.paiementPawapay.count({ where: { id: depot, statut: "cree" } }))) {
    await synchroniserPaiement(depot).catch((e) => console.error("[pawapay] rappel dépôt", depot, e instanceof Error ? e.message : e));
  } else if (depot && (await prisma.achatCoins.count({ where: { id: depot, statut: "cree" } }))) {
    await synchroniserAchat(depot).catch((e) => console.error("[pawapay] rappel coins", depot, e instanceof Error ? e.message : e));
  }
  if (versement) {
    await synchroniserVersement(versement).catch((e) => console.error("[pawapay] rappel versement", versement, e instanceof Error ? e.message : e));
  }
  return NextResponse.json({ ok: true });
}

export const GET = () => NextResponse.json({ ok: true });
