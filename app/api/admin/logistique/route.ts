// Tour de contrôle : lecture réservée à la section Opérations, actions au super-admin et aux Opérations.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSessionPour } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { reponseErreur, refus } from "@/lib/logistique/api";
import { deciderDocument, marquerLotPaye, preparerLotReglement, rendreCreditsCourse, resoudreIncident, suspendreFournisseur } from "@/lib/logistique/service";
import { lancerSimulation, tourDeControle } from "@/lib/logistique/vues";
import { changerEtatModele } from "@/lib/logistique/pilotage";

const action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("document"), id: z.string(), statut: z.enum(["verifie", "rejete", "suspendu"]), motif: z.string().max(300).nullish(), expireLe: z.string().nullish() }),
  z.object({ action: z.literal("suspendre"), id: z.string(), suspendu: z.boolean(), motif: z.string().max(300).nullish() }),
  z.object({ action: z.literal("incident"), id: z.string(), statut: z.enum(["resolu", "rejete"]), resolution: z.string().min(3).max(1000), responsable: z.enum(["fournisseur", "marchand", "client", "externe", "inconnu"]).nullish(), issue: z.enum(["livree", "echec", "retournee"]).nullish() }),
  z.object({ action: z.literal("lot"), fournisseurId: z.string() }),
  z.object({ action: z.literal("payer"), id: z.string(), reference: z.string().min(3).max(120) }),
  z.object({ action: z.literal("modele"), id: z.string().max(40), etat: z.enum(["actif", "shadow", "retire"]) }),
  z.object({ action: z.literal("rendre_credits"), courseId: z.string() }),
  z.object({ action: z.literal("droit"), plan: z.enum(["palier1", "palier2"]), creditsMensuels: z.number().min(0).max(100000000), montantMaxCourse: z.number().positive().nullable(), poidsMaxKg: z.number().positive().nullable(), actif: z.boolean() }),
  z.object({ action: z.literal("politique"), config: z.object({ delaiAcceptationS: z.number().int().min(30).max(3600), tentativesMax: z.number().int().min(1).max(10), valeurMaxEssai: z.number().min(0).nullish(), deploiementPct: z.number().int().min(0).max(100).optional(), preferVerifie: z.boolean(), noteMinAuto: z.number().min(0).max(100), valeurApprobation: z.number().positive().nullable(), pause: z.boolean() }) }),
  z.object({ action: z.literal("simuler"), nom: z.string().trim().min(2).max(120), demandePct: z.number().min(-90).max(500).optional(), capacitePct: z.number().min(-100).max(500).optional(), coutPct: z.number().min(-90).max(500).optional(), fournisseurIndisponible: z.string().nullish(), nouveauxFournisseurs: z.number().int().min(0).max(500).optional(), capaciteParNouveau: z.number().int().min(1).max(5000).optional() }),
]);

export async function GET() {
  const a = await getAdminSessionPour("operations");
  if (!a) return refus(403, "Accès refusé");
  const [tour, droits, politique] = await Promise.all([tourDeControle(), prisma.droitLivraisonPlan.findMany(), prisma.politiqueDispatch.findFirst({ where: { portee: "global", actif: true }, orderBy: { version: "desc" } })]);
  return NextResponse.json({ ...tour, droits, politique, peutAgir: a.role === "admin" || a.role === "admin_operations" });
}

export async function POST(req: NextRequest) {
  const a = await getAdminSessionPour("operations");
  if (!a) return refus(403, "Accès refusé");
  const r = action.safeParse(await req.json().catch(() => null));
  if (!r.success) return refus(400, r.error.issues[0]?.message ?? "Action invalide");
  const d = r.data;
  // La simulation n'écrit rien de réel ; toute autre action exige un rôle opérationnel.
  if (d.action !== "simuler" && a.role !== "admin" && a.role !== "admin_operations") return refus(403, "Lecture seule");
  if (["lot", "payer", "droit", "politique", "rendre_credits", "modele"].includes(d.action) && a.role !== "admin") return refus(403, "Action réservée au super-admin");
  try {
    if (d.action === "document") await deciderDocument(a.userId, d.id, d.statut, d.motif, d.expireLe);
    else if (d.action === "suspendre") await suspendreFournisseur(a.userId, d.id, d.suspendu, d.motif);
    else if (d.action === "incident") await resoudreIncident(a.userId, d.id, d);
    else if (d.action === "lot") return NextResponse.json({ lot: await preparerLotReglement(a.userId, d.fournisseurId) });
    else if (d.action === "payer") await marquerLotPaye(a.userId, d.id, d.reference);
    else if (d.action === "rendre_credits") await rendreCreditsCourse(a.userId, d.courseId);
    else if (d.action === "modele") await changerEtatModele(a.userId, d.id, d.etat);
    else if (d.action === "droit") {
      const { action: _a, plan, ...v } = d;
      await prisma.$transaction([prisma.droitLivraisonPlan.upsert({ where: { plan }, create: { plan, ...v }, update: v }), prisma.journalLogistique.create({ data: { acteurType: "admin", acteurId: a.userId, action: "droit.modifie", entite: "DroitLivraisonPlan", entiteId: plan, apres: v } })]);
    } else if (d.action === "politique") {
      await prisma.$transaction(async (tx) => {
        const der = await tx.politiqueDispatch.findFirst({ where: { portee: "global" }, orderBy: { version: "desc" }, select: { version: true } });
        await tx.politiqueDispatch.updateMany({ where: { portee: "global", actif: true }, data: { actif: false } });
        const version = (der?.version ?? 1) + 1;
        await tx.politiqueDispatch.create({ data: { portee: "global", version, config: d.config, creePar: a.userId } });
        await tx.journalLogistique.create({ data: { acteurType: "admin", acteurId: a.userId, action: "politique.publiee", entite: "PolitiqueDispatch", entiteId: String(version), apres: d.config } });
      });
    } else {
      const { action: _a, nom, ...s } = d;
      const resultats = await lancerSimulation(s);
      await prisma.scenarioSimulation.create({ data: { nom, parametres: s, resultats, creePar: a.userId } });
      return NextResponse.json({ resultats });
    }
    return NextResponse.json({ ok: true });
  } catch (e) { return reponseErreur(e); }
}
