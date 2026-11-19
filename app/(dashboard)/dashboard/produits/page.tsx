import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MetricsStrip, type StatutBadge } from "@/components/ui/adm";
import { ProduitsTutorial } from "@/components/dashboard/tutorials/ProduitsTutorial";
import { formatMontant } from "@/lib/utils";
import { getT } from "@/lib/i18n/serveur";
import { TYPES_NUMERIQUES } from "@/lib/pricing";
import { PAR_PAGE, TYPES_FILTRE, VUES, badgeProduit, badgeStock, lireFiltres, orderByProduits, whereProduits } from "./filtres";
import { EnTeteProduits, ListeProduits, type LigneProduit } from "./ListeProduits";

export default async function ProduitsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "produits");
  const sp = await searchParams;

  // Ancien lien ?filtre=… (tableau de bord, Axia) → vue équivalente, sans casser l'URL (D23).
  if (typeof sp.filtre === "string") {
    const qs = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" && k !== "filtre" ? [[k, v]] : [])));
    if (sp.filtre && sp.filtre !== "all") qs.set("vue", sp.filtre);
    redirect(`/dashboard/produits${qs.size ? `?${qs}` : ""}`);
  }

  const f = lireFiltres(sp);
  const tenantId = (session.user as any)?.tenantId;
  const where = whereProduits(tenantId, f);
  const base = { tenantId };
  const vue = (id: string) => ({ ...base, ...VUES.find((v) => v.id === id)!.where });

  const [tenant, produits, totalFiltre, totalTous, enLigne, faible, epuise, ventes] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { devise: true } }),
    prisma.produit.findMany({
      where,
      select: { id: true, nom: true, images: true, actif: true, exempleAxia: true, type: true, stock: true, categorie: true, prix: true, ventes: true, _count: { select: { avis: true } } },
      orderBy: orderByProduits(f.tri),
      skip: (f.page - 1) * PAR_PAGE,
      take: PAR_PAGE,
    }),
    prisma.produit.count({ where }),
    prisma.produit.count({ where: base }),
    prisma.produit.count({ where: vue("actif") }),
    prisma.produit.count({ where: vue("faible") }),
    prisma.produit.count({ where: vue("epuise") }),
    prisma.produit.aggregate({ where: base, _sum: { ventes: true } }),
  ]);
  const devise = tenant?.devise || "XOF";

  const LIBELLES_TYPE: Record<string, string> = { physique: "Physique", dropshipping: "Dropshipping" };
  const traduit = (b: StatutBadge): StatutBadge => ({ ...b, label: t(b.label) });

  const lignes: LigneProduit[] = produits.map((p) => {
    const alerte = badgeStock(p);
    return {
      id: p.id,
      nom: t(p.nom),
      image: p.images?.[0] ?? null,
      statut: traduit(badgeProduit(p)),
      stock: p.type !== "physique" ? t("Sans stock à gérer") : p.exempleAxia ? "—" : t("{0} en stock", p.stock),
      alerteStock: alerte ? traduit(alerte) : null,
      categorie: p.categorie ? t(p.categorie) : "—",
      type: t(TYPES_NUMERIQUES.has(p.type) ? "Numérique" : LIBELLES_TYPE[p.type] ?? p.type),
      prix: formatMontant(p.prix, devise),
      ventes: p.ventes,
      avis: p._count.avis,
      exemple: p.exempleAxia && !p.actif ? { prix: p.prix, image: p.images?.[0], digital: p.type !== "physique" } : null,
    };
  });
  const filtre = f.vue !== "tous" || !!f.type || !!f.q;

  return (
    <div className="space-y-4">
      <ProduitsTutorial />
      <EnTeteProduits />

      {totalTous > 0 && (
        <MetricsStrip period={t("Catalogue")} metrics={[
          { id: "en-ligne", label: t("Produits en ligne"), definition: t("Produits visibles par vos clients, sur {0} au total.", totalTous), value: String(enLigne) },
          { id: "ventes", label: t("Ventes totales"), definition: t("Unités vendues depuis la création de chaque produit."), value: String(ventes._sum.ventes ?? 0) },
          { id: "faible", label: t("Stock faible"), definition: t("Produits physiques en ligne avec 1 à 5 unités en stock."), value: String(faible) },
          { id: "rupture", label: t("En rupture"), definition: t("Produits physiques en ligne sans stock."), value: String(epuise) },
        ]} />
      )}

      <ListeProduits
        lignes={lignes}
        vues={VUES.map((v) => ({ id: v.id, label: t(v.label) }))}
        filtres={[{ key: "type", label: t("Type"), options: Object.entries(TYPES_FILTRE).map(([value, x]) => ({ value, label: t(x.label) })) }]}
        tri={f.tri}
        page={f.page}
        total={totalFiltre}
        parPage={PAR_PAGE}
        filtre={filtre}
      />
    </div>
  );
}
