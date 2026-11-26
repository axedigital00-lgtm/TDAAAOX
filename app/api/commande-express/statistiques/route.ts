// Releasit COD AXSO — statistiques (dashboard) : entonnoir, CA commandé / encaissé, sources, villes,
// test A/B et quota de commandes du forfait. ?jours=7|30|90
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contexteMarchand } from "@/lib/commande-express/acces";
import { comparerVariantes, regrouper } from "@/lib/commande-express/statistiques";
import { commandesCeMois, planActif } from "@/lib/abonnement";
import { LIMITES, NOMS_PALIERS } from "@/lib/plans";

export async function GET(req: NextRequest) {
  const c = await contexteMarchand("lecture");
  if ("erreur" in c) return c.erreur;
  const jours = [7, 30, 90].includes(Number(req.nextUrl.searchParams.get("jours"))) ? Number(req.nextUrl.searchParams.get("jours")) : 30;
  const depuis = new Date(Date.now() - jours * 86_400_000);
  const jourDebut = depuis.toISOString().slice(0, 10);
  const [stats, fiches, reglages, tenant, plan, utilisees] = await Promise.all([
    prisma.statReleasitJour.findMany({ where: { tenantId: c.tenantId, jour: { gte: jourDebut } } }),
    prisma.commandeExpress.findMany({ where: { tenantId: c.tenantId, commandeId: { not: null }, createdAt: { gte: depuis } }, select: { commandeId: true, statutConfirmation: true, source: true, variante: true, createdAt: true } }),
    prisma.reglagesCommandeExpress.findUnique({ where: { tenantId: c.tenantId }, select: { abTest: true, texteBouton: true } }),
    prisma.tenant.findUnique({ where: { id: c.tenantId }, select: { devise: true } }),
    planActif(c.tenantId), commandesCeMois(c.tenantId),
  ]);
  const commandes = await prisma.commande.findMany({ where: { tenantId: c.tenantId, id: { in: fiches.map((f) => f.commandeId!) } }, select: { id: true, statut: true, montantTotal: true, ville: true } });
  const parId = new Map(commandes.map((x) => [x.id, x]));
  const lignes = fiches.flatMap((f) => {
    const cmd = parId.get(f.commandeId!);
    return cmd ? [{ source: f.source as Record<string, string> | null, ville: cmd.ville, statut: cmd.statut, confirmee: f.statutConfirmation === "confirmee", montant: cmd.montantTotal, variante: f.variante, createdAt: f.createdAt }] : [];
  });
  const somme = (k: "affichages" | "ouvertures", v?: string) => stats.filter((s) => !v || s.variante === v).reduce((n, s) => n + s[k], 0);
  const valides = lignes.filter((l) => l.statut !== "annulee");
  const livrees = lignes.filter((l) => l.statut === "livree");
  const caCommande = valides.reduce((n, l) => n + l.montant, 0);

  // Test A/B : depuis son début, commandes par variante rapportées aux affichages du bouton.
  const ab = reglages?.abTest as { actif?: boolean; texteB?: string; debut?: string } | null;
  let resultatAb = null;
  if (ab?.texteB) {
    const debut = ab.debut ?? jourDebut;
    const [statsAb, fichesAb] = await Promise.all([
      prisma.statReleasitJour.findMany({ where: { tenantId: c.tenantId, jour: { gte: debut } } }),
      prisma.commandeExpress.groupBy({ by: ["variante"], where: { tenantId: c.tenantId, commandeId: { not: null }, createdAt: { gte: new Date(debut) }, variante: { in: ["A", "B"] } }, _count: { _all: true } }),
    ]);
    const n = (v: string) => ({ essais: statsAb.filter((s) => s.variante === v).reduce((x, s) => x + s.affichages, 0), succes: fichesAb.find((g) => g.variante === v)?._count._all ?? 0 });
    const A = n("A"), B = n("B");
    resultatAb = { actif: !!ab.actif, debut, texteA: reglages?.texteBouton ?? "", texteB: ab.texteB, A, B, ...comparerVariantes(A, B) };
  }

  const limite = LIMITES[plan.plan]?.commandesParMois ?? null;
  return NextResponse.json({
    jours, devise: tenant?.devise ?? "XAF",
    entonnoir: { affichages: somme("affichages"), ouvertures: somme("ouvertures"), commandes: lignes.length, confirmees: lignes.filter((l) => l.confirmee).length, livrees: livrees.length },
    ca: { commande: caCommande, encaisse: livrees.reduce((n, l) => n + l.montant, 0), panierMoyen: valides.length ? Math.round(caCommande / valides.length) : 0 },
    sources: regrouper(lignes, (l) => l.source?.utm_source ?? (l.source?.fbclid ? "facebook" : l.source?.ttclid ? "tiktok" : l.source?.gclid ? "google" : "")),
    villes: regrouper(lignes, (l) => l.ville),
    ab: resultatAb,
    quota: { forfait: NOMS_PALIERS[plan.plan], limite, utilisees },
  });
}
