// Suivi d'un service acheté, côté client (lien privé, sans compte). GET : état + créneaux libres ;
// POST { action } : brief | reserver | annuler | message | revision | valider.
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import {
  ajouterMessage, annulerSeanceClient, chargerCommandeService, creneauxDuService, demanderRevision, reserverSeance, soumettreBrief, validerPrestation,
} from "@/lib/numerique/service";

type Ctx = { params: Promise<{ token: string }> };
const limite = rateLimit({ windowMs: 60_000, max: 30, keyPrefix: "service" });

export async function GET(_req: NextRequest, { params }: Ctx) {
  const cs = await chargerCommandeService((await params).token);
  if (!cs) return NextResponse.json({ error: "Lien invalide ou expiré" }, { status: 404 });
  const s = cs.service;
  const confirmee = cs.seances.some((x) => x.statut === "confirmee");
  return NextResponse.json({
    produit: s.produit.nom, boutique: s.produit.tenant.nomBoutique, statut: cs.statut, clientNom: cs.clientNom,
    mode: s.mode, seancesIncluses: s.seances, dureeMin: s.dureeMin, lieu: s.lieu, fuseau: s.fuseau,
    // Lien de visio et adresse révélés seulement avec une séance confirmée.
    lienVisio: confirmee ? s.lienVisio : null, adresse: confirmee ? s.adresse : null,
    preavisHeures: s.preavisHeures, brief: s.brief, briefReponses: cs.briefReponses, echeance: cs.echeance,
    revisionsRestantes: Math.max(0, s.revisionsIncluses - cs.revisionsUtilisees),
    seances: cs.seances.map((x) => ({ id: x.id, debut: x.debut, fin: x.fin, statut: x.statut, compteRendu: x.compteRendu })),
    livrables: cs.livrables, messages: cs.messages,
    creneaux: s.mode === "rendez_vous" && !["brief_attendu", "termine", "annule"].includes(cs.statut) ? (await creneauxDuService(s.id)).slice(0, 120) : [],
  });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const rl = limite.check(getClientIp(req));
  if (!rl.success) return rateLimitResponse(rl.reset);
  const cs = await chargerCommandeService((await params).token);
  if (!cs) return NextResponse.json({ error: "Lien invalide ou expiré" }, { status: 404 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const txt = (k: string) => (typeof b[k] === "string" ? (b[k] as string) : "");
  let r: { ok: boolean; erreur?: string };
  switch (b.action) {
    case "brief": r = await soumettreBrief(cs, (b.reponses as Record<string, unknown>) ?? {}); break;
    case "reserver": r = await reserverSeance(cs, txt("debut")); break;
    case "annuler": r = await annulerSeanceClient(cs, txt("seanceId")); break;
    case "message": r = await ajouterMessage(cs.id, "client", txt("texte")); break;
    case "revision": r = await demanderRevision(cs, txt("motif") || "—"); break;
    case "valider": r = await validerPrestation(cs, Number(b.note) || undefined, txt("avis")); break;
    default: return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.erreur }, { status: 400 });
}
