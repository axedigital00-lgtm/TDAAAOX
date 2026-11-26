// Anti-fraude Releasit COD AXSO : liste noire, limite par jour et commandes à risque (30 jours).
// GET : état ; POST : bloquer un numéro, ou le numéro et la connexion d'une commande ; DELETE ?id= : débloquer.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { contexteMarchand } from "@/lib/commande-express/acces";
import { lireReglages } from "@/lib/commande-express/reglages";
import { normaliserTelephone } from "@/lib/devise-convert";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("bloquer_numero"), telephone: z.string().trim().min(6).max(30), motif: z.string().trim().max(200).optional() }),
  z.object({ action: z.literal("bloquer_commande"), ficheId: z.string().min(1).max(40), motif: z.string().trim().max(200).optional() }),
]);

export async function GET() {
  const c = await contexteMarchand("lecture");
  if ("erreur" in c) return c.erreur;
  const depuis = new Date(Date.now() - 30 * 86_400_000);
  const [reglages, liste, risquees] = await Promise.all([
    lireReglages(c.tenantId),
    prisma.listeNoireCommande.findMany({ where: { tenantId: c.tenantId }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.commandeExpress.findMany({ where: { tenantId: c.tenantId, commandeId: { not: null }, createdAt: { gte: depuis }, scoreRisque: { gte: 30 } }, orderBy: [{ scoreRisque: "desc" }, { createdAt: "desc" }], take: 30, select: { id: true, commandeId: true, scoreRisque: true, facteursRisque: true, statutConfirmation: true, telephone: true, createdAt: true } }),
  ]);
  const commandes = await prisma.commande.findMany({ where: { tenantId: c.tenantId, id: { in: risquees.map((r) => r.commandeId!) } }, select: { id: true, numero: true, clientNom: true, montantTotal: true, devise: true } });
  const parId = new Map(commandes.map((x) => [x.id, x]));
  return NextResponse.json({
    limiteParJour: reglages.limiteParJour,
    // L'empreinte d'IP n'est jamais montrée : seulement « connexion bloquée ».
    listeNoire: liste.map((l) => ({ id: l.id, type: l.type, valeur: l.type === "telephone" ? l.valeur : null, motif: l.motif, createdAt: l.createdAt })),
    risquees: risquees.flatMap((r) => { const cmd = parId.get(r.commandeId!); return cmd ? [{ ...r, commande: cmd }] : []; }),
  });
}

export async function POST(req: NextRequest) {
  const c = await contexteMarchand("ecriture");
  if ("erreur" in c) return c.erreur;
  const lu = schema.safeParse(await req.json().catch(() => ({})));
  if (!lu.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  const a = lu.data;
  const entrees: { type: string; valeur: string }[] = [];
  if (a.action === "bloquer_numero") {
    const tenant = await prisma.tenant.findUnique({ where: { id: c.tenantId }, select: { pays: true } });
    const tel = normaliserTelephone(a.telephone, tenant?.pays);
    if (!tel) return NextResponse.json({ error: "Numéro de téléphone invalide" }, { status: 400 });
    entrees.push({ type: "telephone", valeur: tel });
  } else {
    const fiche = await prisma.commandeExpress.findFirst({ where: { id: a.ficheId, tenantId: c.tenantId }, select: { telephone: true, ipHash: true } });
    if (!fiche) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    if (fiche.telephone) entrees.push({ type: "telephone", valeur: fiche.telephone });
    if (fiche.ipHash) entrees.push({ type: "ip", valeur: fiche.ipHash });
    if (!entrees.length) return NextResponse.json({ error: "Rien à bloquer pour cette commande" }, { status: 400 });
  }
  for (const e of entrees) {
    await prisma.listeNoireCommande.upsert({
      where: { tenantId_type_valeur: { tenantId: c.tenantId, type: e.type, valeur: e.valeur } },
      create: { tenantId: c.tenantId, ...e, motif: a.motif }, update: { ...(a.motif && { motif: a.motif }) },
    });
  }
  return NextResponse.json({ ok: true, bloques: entrees.length });
}

export async function DELETE(req: NextRequest) {
  const c = await contexteMarchand("ecriture");
  if ("erreur" in c) return c.erreur;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  const r = await prisma.listeNoireCommande.deleteMany({ where: { id, tenantId: c.tenantId } });
  return r.count ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Introuvable" }, { status: 404 });
}
