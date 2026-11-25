// Commande Express AXSO — réglages et suivi pour le dashboard du marchand.
// GET : réglages, chiffres des 30 derniers jours et dernières commandes express.
// PATCH : réglages (droit d'écriture sur les commandes).
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireNiveau } from "@/lib/permissions-server";
import { lireReglages, nettoyerReglages } from "@/lib/commande-express/reglages";

async function contexte(niveau: "lecture" | "ecriture") {
  const session = await auth();
  const tenantId = (session?.user as { tenantId?: string } | undefined)?.tenantId;
  if (!session || !tenantId) return { erreur: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  const refus = await requireNiveau(session, "commandes", niveau);
  if (refus) return { erreur: NextResponse.json({ error: refus.error }, { status: refus.status }) };
  return { tenantId };
}

export async function GET() {
  const c = await contexte("lecture");
  if ("erreur" in c) return c.erreur;
  const depuis = new Date(Date.now() - 30 * 86_400_000);
  const [reglages, recentes, parStatut, tenant] = await Promise.all([
    lireReglages(c.tenantId),
    prisma.commandeExpress.findMany({ where: { tenantId: c.tenantId, commandeId: { not: null } }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, commandeId: true, statutConfirmation: true, quartier: true, source: true, createdAt: true } }),
    prisma.commandeExpress.groupBy({ by: ["statutConfirmation"], where: { tenantId: c.tenantId, commandeId: { not: null }, createdAt: { gte: depuis } }, _count: { _all: true } }),
    prisma.tenant.findUnique({ where: { id: c.tenantId }, select: { slug: true, devise: true, parametresLivraison: true } }),
  ]);
  const commandes = await prisma.commande.findMany({ where: { id: { in: recentes.map((r) => r.commandeId!) }, tenantId: c.tenantId }, select: { id: true, numero: true, clientNom: true, clientTelephone: true, montantTotal: true, devise: true, ville: true, statut: true } });
  const parId = new Map(commandes.map((x) => [x.id, x]));
  const zones = Array.isArray((tenant?.parametresLivraison as any)?.zones) ? (tenant!.parametresLivraison as any).zones.length : 0;
  return NextResponse.json({
    reglages, slug: tenant?.slug, zonesConfigurees: zones,
    stats: Object.fromEntries(parStatut.map((s) => [s.statutConfirmation, s._count._all])),
    recentes: recentes.map((r) => ({ ...r, commande: parId.get(r.commandeId!) ?? null })),
  });
}

export async function PATCH(req: NextRequest) {
  const c = await contexte("ecriture");
  if ("erreur" in c) return c.erreur;
  const maj = nettoyerReglages((await req.json().catch(() => ({}))) ?? {});
  const r = await prisma.reglagesCommandeExpress.upsert({ where: { tenantId: c.tenantId }, create: { tenantId: c.tenantId, ...maj }, update: maj });
  return NextResponse.json({ reglages: { actif: r.actif, boutonCollant: r.boutonCollant, texteBouton: r.texteBouton, couleur: r.couleur, demanderEmail: r.demanderEmail } });
}
