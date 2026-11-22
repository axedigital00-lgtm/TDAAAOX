// Demande de livraison d'une commande : création de la course puis décision de dispatch.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { exigerMarchand, limiter, refus, reponseErreur } from "@/lib/logistique/api";
import { creerCourse, lancerDispatch } from "@/lib/logistique/service";

const corps = z.object({ commandeId: z.string().min(1).max(40), poidsKg: z.number().positive().max(100000).nullish(), express: z.boolean().optional(), vehiculeRequis: z.enum(["moto", "velo", "voiture", "fourgon", "camion", "a_pied", "autre"]).nullish(), quartier: z.string().trim().max(80).nullish() });

export async function POST(req: NextRequest) {
  const m = await exigerMarchand("ecriture");
  if ("erreur" in m) return m.erreur;
  const l = limiter(m.s.userId); if (l) return l;
  const r = corps.safeParse(await req.json().catch(() => null));
  if (!r.success) return refus(400, "Demande invalide");
  try {
    const { commandeId, ...o } = r.data;
    const c = await creerCourse(m.tenantId, commandeId, o);
    const d = c.statut === "attente_fournisseur" ? await lancerDispatch(c.id, { type: "marchand", id: m.tenantId }) : null;
    return NextResponse.json({ id: c.id, reference: c.reference, decision: d?.decision ?? null }, { status: 201 });
  } catch (e) { return reponseErreur(e); }
}
