// Côté prestataire : un achat de service (GET) et ses actions (POST) : message | livrable | seance | statut.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ajouterMessage, deposerLivrable, prevenirClient } from "@/lib/numerique/service";

type Ctx = { params: Promise<{ id: string }> };

async function duMarchand(id: string) {
  const tenantId = ((await auth())?.user as { tenantId?: string } | undefined)?.tenantId;
  if (!tenantId) return null;
  return prisma.commandeService.findFirst({ where: { id, tenantId }, include: { seances: { orderBy: { debut: "asc" } }, service: { include: { produit: { select: { nom: true } } } } } });
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const cs = await duMarchand((await params).id);
  return cs ? NextResponse.json({ commande: cs }) : NextResponse.json({ error: "Introuvable" }, { status: 404 });
}

const action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("message"), texte: z.string().min(1).max(4000) }),
  z.object({ action: z.literal("livrable"), nom: z.string().trim().min(1).max(200), url: z.string().url().refine((u) => u.startsWith("https://"), "Lien https requis"), note: z.string().max(2000).optional() }),
  z.object({ action: z.literal("seance"), seanceId: z.string().max(40), statut: z.enum(["confirmee", "realisee", "annulee", "absent"]).optional(), compteRendu: z.string().max(10000).optional() }),
  z.object({ action: z.literal("statut"), statut: z.enum(["en_cours", "termine", "annule"]) }),
]);

export async function POST(req: NextRequest, { params }: Ctx) {
  const cs = await duMarchand((await params).id);
  if (!cs) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const r = action.safeParse(await req.json().catch(() => null));
  if (!r.success) return NextResponse.json({ error: r.error.issues[0]?.message ?? "Données invalides" }, { status: 400 });
  const d = r.data;
  if (d.action === "message") return NextResponse.json(await ajouterMessage(cs.id, "prestataire", d.texte));
  if (d.action === "livrable") return NextResponse.json(await deposerLivrable(cs.id, d));
  if (d.action === "statut") {
    await prisma.commandeService.update({ where: { id: cs.id }, data: { statut: d.statut } });
    return NextResponse.json({ ok: true });
  }
  const s = cs.seances.find((x) => x.id === d.seanceId);
  if (!s) return NextResponse.json({ error: "Séance introuvable" }, { status: 404 });
  await prisma.seanceService.update({ where: { id: s.id }, data: { ...(d.statut ? { statut: d.statut } : {}), ...(d.compteRendu !== undefined ? { compteRendu: d.compteRendu } : {}) } });
  if (d.statut === "confirmee") await prevenirClient(cs.id, "Votre séance est confirmée", "Retrouvez les informations de connexion sur votre page de suivi.").catch(() => {});
  return NextResponse.json({ ok: true });
}
