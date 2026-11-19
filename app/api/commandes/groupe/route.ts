// Action groupée sur des commandes sélectionnées : même règle que l'action unitaire
// (lib/cycle-livraison.ts → changerStatutCommande), appliquée commande par commande.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { changerStatutCommande } from "@/lib/cycle-livraison";
import { STATUTS_GROUPES, repartirTransition } from "@/lib/commandes-provisoires";
import { marchandCommandes } from "../brouillons/schema";

const schema = z.object({ ids: z.array(z.string().min(1).max(40)).min(1).max(200), statut: z.enum(STATUTS_GROUPES) });

export async function POST(req: NextRequest) {
  const m = await marchandCommandes();
  if ("error" in m) return NextResponse.json({ error: m.error }, { status: m.status });
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Sélection invalide" }, { status: 400 });
  const commandes = await prisma.commande.findMany({ where: { id: { in: p.data.ids }, tenantId: m.tenantId }, select: { id: true, statut: true } });
  const { possibles, ignorees } = repartirTransition(commandes, p.data.statut);
  let faites = 0;
  const erreurs: string[] = [];
  for (const id of possibles) {
    const r = await changerStatutCommande({ commandeId: id, statut: p.data.statut, acteur: { type: "marchand", tenantId: m.tenantId, source: "interface" } });
    if (r.ok) faites++; else erreurs.push(r.error);
  }
  return NextResponse.json({ faites, ignorees: ignorees.length + (p.data.ids.length - commandes.length), erreurs: erreurs.length });
}
