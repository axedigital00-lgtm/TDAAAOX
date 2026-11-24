// Une course : suivi selon le rôle (GET) et actions (POST).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { acteurCourse, limiter, refus, reponseErreur, sessionLogistique } from "@/lib/logistique/api";
import { assignerFournisseur, avancerCourse, lancerDispatch, livrerCourse, noterCourse, ouvrirIncident, recommandations } from "@/lib/logistique/service";
import { vueCourse } from "@/lib/logistique/vues";
import type { StatutCourse } from "@/lib/logistique/types";

type Ctx = { params: Promise<{ id: string }> };
const action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("assigner"), fournisseurId: z.string().max(40), cle: z.string().min(8).max(80) }),
  z.object({ action: z.literal("relancer") }),
  z.object({ action: z.literal("statut"), statut: z.enum(["attente_fournisseur", "enlevement_planifie", "enlevee", "en_transit", "proche_destination", "echec", "retournee", "annulee"]), motif: z.string().max(300).nullish(), responsable: z.enum(["fournisseur", "marchand", "client", "externe", "inconnu"]).nullish() }),
  z.object({ action: z.literal("livrer"), photo: z.string().max(700000).nullish(), code: z.string().max(10).nullish(), signature: z.string().max(200000).nullish(), photoUrl: z.string().url().max(1000).nullish(), confirmationClient: z.boolean().optional(), lat: z.number().min(-90).max(90).nullish(), lng: z.number().min(-180).max(180).nullish() }),
  z.object({ action: z.literal("incident"), type: z.enum(["incident", "litige", "contestation"]), description: z.string().min(5).max(1000), severite: z.enum(["INFO", "WARNING", "HIGH_PRIORITY", "CRITICAL"]).optional() }),
  z.object({ action: z.literal("noter"), note: z.number().int().min(1).max(5), commentaire: z.string().max(500).nullish() }),
]);

export async function GET(req: NextRequest, { params }: Ctx) {
  const s = await sessionLogistique();
  if (!s) return refus();
  const { id } = await params;
  const a = await acteurCourse(id, s, "lecture");
  if (!a || a.type === "systeme") return refus(404, "Course introuvable");
  const vue = await vueCourse(id, a.type);
  if (!vue) return refus(404, "Course introuvable");
  if (a.type !== "fournisseur" && req.nextUrl.searchParams.get("options") === "1" && vue.statut === "attente_fournisseur") {
    const r = await recommandations(id);
    return NextResponse.json({ course: vue, options: { classes: r.classes.map((x) => ({ id: x.candidat.id, nom: x.candidat.nom, type: x.candidat.type, verifie: x.candidat.statutLegal === "verifie", certifie: !!x.candidat.certifie, niveau: x.candidat.score.niveau, probation: x.candidat.score.probation, badges: x.candidat.score.badges, score: x.candidat.score.global, note: x.note, prix: x.candidat.prix, raisons: x.raisons, lignes: x.devis?.lignes ?? [], credit: x.devis?.creditApplique ?? 0 })), categories: r.categories, ecartes: r.ecartes.length } });
  }
  return NextResponse.json({ course: vue });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const s = await sessionLogistique();
  if (!s) return refus();
  const lim = limiter(s.userId); if (lim) return lim;
  const { id } = await params;
  const a = await acteurCourse(id, s, "ecriture");
  if (!a) return refus(404, "Course introuvable");
  const r = action.safeParse(await req.json().catch(() => null));
  if (!r.success) return refus(400, r.error.issues[0]?.message ?? "Action invalide");
  const d = r.data;
  try {
    if (d.action === "assigner") {
      if (a.type === "fournisseur") return refus(403, "Accès refusé");
      const x = await assignerFournisseur(id, d.fournisseurId, a, `manuel:${id}:${d.cle}`);
      return NextResponse.json({ assignationId: x.id });
    }
    if (d.action === "relancer") {
      if (a.type === "fournisseur") return refus(403, "Accès refusé");
      return NextResponse.json((await lancerDispatch(id, a)).decision);
    }
    if (d.action === "statut") return NextResponse.json(await avancerCourse(id, d.statut as StatutCourse, a, { motif: d.motif, responsable: a.type === "admin" ? d.responsable : d.statut === "annulee" ? "marchand" : "inconnu" }));
    if (d.action === "livrer") {
      if (a.type === "marchand") return refus(403, "La preuve est enregistrée par le livreur");
      return NextResponse.json(await livrerCourse(id, a, d));
    }
    if (d.action === "incident") return NextResponse.json({ incident: await ouvrirIncident(id, a, d) }, { status: 201 });
    if (a.type !== "marchand") return refus(403, "Seul le marchand évalue");
    await noterCourse(a.id!, id, d.note, d.commentaire);
    return NextResponse.json({ ok: true });
  } catch (e) { return reponseErreur(e); }
}
