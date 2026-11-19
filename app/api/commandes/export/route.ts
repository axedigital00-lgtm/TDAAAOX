import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classeurXlsx, TYPE_XLSX } from "@/lib/excel";
import { requireNiveau } from "@/lib/permissions-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const tenantId = (session.user as any)?.tenantId;
  if (!tenantId) return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });
  const refus = await requireNiveau(session, "commandes", "lecture");
  if (refus) return NextResponse.json({ error: refus.error }, { status: refus.status });

  const { searchParams } = new URL(req.url);
  const depuis = searchParams.get("depuis");
  const statut = searchParams.get("statut");
  // Sélection de la liste (actions groupées) : ids séparés par des virgules.
  const ids = searchParams.get("ids")?.split(",").filter(Boolean).slice(0, 500);

  const where: any = { tenantId };
  if (depuis)  where.createdAt = { gte: new Date(depuis) };
  if (statut)  where.statut = statut;
  if (ids?.length) where.id = { in: ids };

  const commandes = await prisma.commande.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      client: true,
      lignes: { include: { produit: { select: { nom: true, type: true } } } },
    },
    take: 2000,
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { nomBoutique: true, devise: true },
  });

  // ── Feuille 1 : Commandes ───────────────────────────────────────────────
  const rowsCommandes = commandes.map(c => ({
    "N° Commande":      c.numero,
    "Date":             new Date(c.createdAt).toLocaleString("fr-FR"),
    "Client":           c.client?.nom ?? "—",
    "Téléphone":        c.client?.telephone ?? "—",
    "Email":            c.client?.email ?? "—",
    "Ville":            c.client?.ville ?? "—",
    "Statut":           c.statut,
    "Paiement":         c.paiementStatut,
    "Méthode":          c.methodePaiement ?? "—",
    "Montant Total":    c.montantTotal,
    "Devise":           c.devise ?? tenant?.devise ?? "XAF",
    "Nb Articles":      c.lignes.reduce((s, l) => s + l.quantite, 0),
    "Produits":         c.lignes.map(l => `${l.produit?.nom ?? "?"} ×${l.quantite}`).join(" | "),
    "Créée le":         c.createdAt.toISOString(),
  }));

  // ── Feuille 2 : Lignes détaillées ───────────────────────────────────────
  const rowsLignes: any[] = [];
  for (const c of commandes) {
    for (const l of c.lignes) {
      rowsLignes.push({
        "N° Commande":   c.numero,
        "Date":          new Date(c.createdAt).toLocaleDateString("fr-FR"),
        "Client":        c.client?.nom ?? "—",
        "Produit":       l.produit?.nom ?? "—",
        "Type":          l.produit?.type ?? "physique",
        "Quantité":      l.quantite,
        "Prix Unitaire": l.prix,
        "Sous-Total":    l.quantite * l.prix,
        "Devise":        c.devise ?? "XAF",
      });
    }
  }

  // ── Feuille résumé ───────────────────────────────────────────────────────
  const totalVentes = commandes.filter(c => c.paiementStatut === "completed").reduce((s, c) => s + c.montantTotal, 0);
  const rowsResume = [
    { "Métrique": "Total commandes exportées",      "Valeur": commandes.length },
    { "Métrique": "Commandes payées",               "Valeur": commandes.filter(c => c.paiementStatut === "completed").length },
    { "Métrique": "Commandes en attente",           "Valeur": commandes.filter(c => c.statut === "en_attente").length },
    { "Métrique": "Commandes livrées",              "Valeur": commandes.filter(c => c.statut === "livree").length },
    { "Métrique": "Chiffre d'affaires total",       "Valeur": `${totalVentes.toLocaleString("fr-FR")} ${tenant?.devise ?? "XAF"}` },
    { "Métrique": "Panier moyen",                   "Valeur": commandes.length ? `${Math.round(totalVentes / commandes.filter(c => c.paiementStatut === "completed").length || 0).toLocaleString("fr-FR")} ${tenant?.devise ?? "XAF"}` : "0" },
    { "Métrique": "Boutique",                       "Valeur": tenant?.nomBoutique ?? "—" },
    { "Métrique": "Export généré le",               "Valeur": new Date().toLocaleString("fr-FR") },
  ];
  // En-têtes = clés des objets ci-dessus (écrites même sans aucune commande).
  const enTableau = (lignes: Record<string, unknown>[], entetes: string[]) =>
    [entetes, ...lignes.map((l) => entetes.map((e) => l[e] as any))];
  const buffer = await classeurXlsx([
    { nom: "Commandes", lignes: enTableau(rowsCommandes, ["N° Commande", "Date", "Client", "Téléphone", "Email", "Ville", "Statut", "Paiement", "Méthode", "Montant Total", "Devise", "Nb Articles", "Produits", "Créée le"]),
      largeurs: [18, 20, 22, 16, 25, 15, 14, 14, 16, 14, 8, 10, 40, 22] },
    { nom: "Lignes articles", lignes: enTableau(rowsLignes, ["N° Commande", "Date", "Client", "Produit", "Type", "Quantité", "Prix Unitaire", "Sous-Total", "Devise"]),
      largeurs: [18, 14, 20, 28, 12, 10, 14, 12, 8] },
    { nom: "Résumé", lignes: enTableau(rowsResume, ["Métrique", "Valeur"]), largeurs: [30, 25] },
  ]);
  const filename = `commandes-axso-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer as BodyInit, {
    headers: {
      "Content-Type": TYPE_XLSX,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
