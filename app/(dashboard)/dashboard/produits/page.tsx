// Produits (MASTERPROMPT §8.6) : en-tête, métriques sur 30 jours (taux de
// vente, jours de stock restants, analyse ABC), vues, recherche et table.
import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { ProduitsTutorial } from "@/components/dashboard/tutorials/ProduitsTutorial";
import { ImportProduitsExcel } from "@/components/dashboard/ImportProduitsExcel";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { MappedBadge, productBadge } from "@/components/dashboard/design-system/components/Badge";
import { MetricsStrip } from "@/components/dashboard/design-system/components/MetricsStrip";
import { IndexFilters } from "@/components/dashboard/design-system/components/IndexTable";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { Icon } from "@/components/dashboard/design-system/icons/Icon";
import { ProductsIndex } from "@/components/dashboard/features/products/ProductsIndex";
import { nombre, pourcentage, debutJour } from "@/components/dashboard/design-system/format";

const PAR_PAGE = 50;
const SEUIL_STOCK_BAS = 5;

const VUES = [
  { id: "tous", label: "Tous" },
  { id: "actifs", label: "Actifs" },
  { id: "brouillon", label: "Brouillon" },
  { id: "stock_bas", label: "Stock bas" },
];
const FILTRES_VUE: Record<string, Prisma.ProduitWhereInput> = {
  actifs: { actif: true },
  brouillon: { actif: false },
  stock_bas: { type: { not: "digital" }, stock: { lte: SEUIL_STOCK_BAS } },
};
// Anciens liens (?filtre=actif…) : toujours acceptés.
const FILTRES_HISTORIQUES: Record<string, string> = { actif: "actifs", inactif: "brouillon", faible: "stock_bas", epuise: "stock_bas" };
const TRIS: Record<string, Prisma.ProduitOrderByWithRelationInput> = {
  "date:desc": { createdAt: "desc" }, "date:asc": { createdAt: "asc" },
  "titre:asc": { nom: "asc" }, "titre:desc": { nom: "desc" },
  "stock:asc": { stock: "asc" }, "stock:desc": { stock: "desc" },
  "ventes:desc": { ventes: "desc" }, "ventes:asc": { ventes: "asc" },
};
const TYPES: Record<string, string> = { physique: "Physique", digital: "Numérique", dropshipping: "Dropshipping" };

type Params = { view?: string; q?: string; sort?: string; page?: string; filtre?: string };

export default async function ProduitsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "produits");
  const sp = await searchParams;
  const tenantId = (session.user as any)?.tenantId as string;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { devise: true, nomBoutique: true } });
  const devise = tenant?.devise || "XAF";

  const vueDemandee = sp.view ?? (sp.filtre ? FILTRES_HISTORIQUES[sp.filtre] : undefined);
  const vue = VUES.some((v) => v.id === vueDemandee) ? vueDemandee! : "tous";
  const q = sp.q?.trim();
  const sort = sp.sort && TRIS[sp.sort] ? sp.sort : "date:desc";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const where: Prisma.ProduitWhereInput = {
    tenantId, ...(FILTRES_VUE[vue] ?? {}),
    ...(q ? { OR: [{ nom: { contains: q, mode: "insensitive" } }, { categorie: { contains: q, mode: "insensitive" } }] } : {}),
  };

  // Ventes des 30 derniers jours (commandes non annulées) pour les métriques.
  const depuis = debutJour(new Date(), -29);
  const [produits, total, lignes, stocks] = await Promise.all([
    prisma.produit.findMany({
      where, orderBy: TRIS[sort], skip: (page - 1) * PAR_PAGE, take: PAR_PAGE,
      select: { id: true, nom: true, images: true, actif: true, stock: true, categorie: true, type: true, nomFournisseur: true, marque: true },
    }),
    prisma.produit.count({ where }),
    prisma.ligneCommande.findMany({
      where: { commande: { tenantId, createdAt: { gte: depuis }, statut: { not: "annulee" } } },
      select: { produitId: true, quantite: true, prix: true },
    }),
    prisma.produit.findMany({ where: { tenantId, actif: true, type: { not: "digital" } }, select: { id: true, nom: true, stock: true } }),
  ]);

  // Taux de vente : unités vendues / (unités vendues + unités en stock).
  const vendues = new Map<string, { qte: number; ca: number }>();
  for (const l of lignes) {
    const v = vendues.get(l.produitId) ?? { qte: 0, ca: 0 };
    v.qte += l.quantite; v.ca += l.quantite * l.prix;
    vendues.set(l.produitId, v);
  }
  const unitesVendues = [...vendues.values()].reduce((t, v) => t + v.qte, 0);
  const unitesStock = stocks.reduce((t, p) => t + Math.max(0, p.stock), 0);
  const tauxVente = unitesVendues + unitesStock ? (unitesVendues / (unitesVendues + unitesStock)) * 100 : null;

  // Jours de stock restants : stock / ventes quotidiennes moyennes (30 j).
  const joursRestants = stocks
    .map((p) => ({ nom: p.nom, jours: (vendues.get(p.id)?.qte ?? 0) > 0 ? Math.floor(p.stock / ((vendues.get(p.id)!.qte) / 30)) : Infinity }))
    .filter((p) => isFinite(p.jours))
    .sort((a, b) => a.jours - b.jours)[0];

  // Analyse ABC : A = 80 % du chiffre d'affaires, B = 15 %, C = 5 %.
  const ca = [...vendues.values()].map((v) => v.ca).sort((a, b) => b - a);
  const caTotal = ca.reduce((t, v) => t + v, 0);
  const abc = { A: 0, B: 0, C: 0 };
  let cumul = 0;
  for (const v of ca) { const part = cumul / (caTotal || 1); abc[part < 0.8 ? "A" : part < 0.95 ? "B" : "C"] += v; cumul += v; }
  const compact = (n: number) => n >= 1e6 ? `${nombre(n / 1e6, 1)} M` : n >= 1e3 ? `${nombre(n / 1e3, 1)} k` : nombre(n);

  const lien = (maj: Partial<Params>) => {
    const p = new URLSearchParams();
    const tout = { view: vue === "tous" ? undefined : vue, q, sort: sort === "date:desc" ? undefined : sort, page: undefined as string | undefined, ...maj };
    for (const [k, v] of Object.entries(tout)) if (v) p.set(k, v);
    const s = p.toString();
    return `/dashboard/produits${s ? `?${s}` : ""}`;
  };
  const nbPages = Math.max(1, Math.ceil(total / PAR_PAGE));

  const columns = [
    { id: "image", header: "", thumbnail: true, width: 52 },
    { id: "produit", header: "Produit", sortKey: "titre", mobilePrimary: true },
    { id: "statut", header: "Statut" },
    { id: "stock", header: "Stock", sortKey: "stock" },
    { id: "categorie", header: "Catégorie", hideOnMobile: true },
    { id: "type", header: "Type de produit", hideOnMobile: true },
    { id: "fournisseur", header: "Fournisseur", hideOnMobile: true },
  ];
  const rows = produits.map((p) => ({
    id: p.id,
    href: `/dashboard/produits/${p.id}`,
    cells: {
      image: <span className="axd-thumb">{p.images[0] ? <img src={p.images[0]} alt="" loading="lazy" /> : <Icon name="image" />}</span>,
      produit: <span className="axd-ix-clamp">{p.nom}</span>,
      statut: <MappedBadge {...productBadge(p.actif ? "active" : "draft")} />,
      stock: p.type === "digital" ? <span className="axd-subdued">Stock non suivi</span>
        : <span className={p.stock <= SEUIL_STOCK_BAS ? "axd-critical-text" : undefined}>{nombre(p.stock)} en stock</span>,
      categorie: p.categorie ?? "",
      type: TYPES[p.type] ?? p.type,
      fournisseur: p.nomFournisseur ?? p.marque ?? tenant?.nomBoutique ?? "",
    },
  }));

  const filtre = !!q || vue !== "tous";
  return (
    <Page>
      <ProduitsTutorial />
      <PageHeader
        icon="tag" title="Produits"
        extraActions={<ImportProduitsExcel />}
        overflowActions={[
          { content: "Importer avec l’IA", href: "/dashboard/produits/imports-ia" },
          { content: "Ajouter un produit numérique", href: "/dashboard/produits/creer" },
          { content: "Studio de cours", href: "/dashboard/produits/studio" },
          { content: "Lives et bootcamps", href: "/dashboard/produits/live" },
        ]}
        primaryAction={{ content: "Ajouter un produit", href: "/dashboard/produits/nouveau" }}
      />

      <MetricsStrip
        periode="30j"
        metrics={[
          { label: "Taux de vente moyen", definition: "Unités vendues / (unités vendues + unités en stock) sur 30 jours.", value: tauxVente === null ? "—" : pourcentage(tauxVente, 2) },
          { label: "Produits par jours de stock restants", definition: "Produit qui sera en rupture le plus tôt au rythme des ventes des 30 derniers jours.",
            value: joursRestants ? <span className="axd-muted" style={{ fontWeight: 400 }}>{joursRestants.nom.slice(0, 28)} : {nombre(joursRestants.jours)} jour{joursRestants.jours > 1 ? "s" : ""}</span> : <span className="axd-muted" style={{ fontWeight: 400 }}>Aucune donnée</span> },
          { label: "Analyse ABC des produits", definition: "Chiffre d’affaires des 30 derniers jours : A = 80 %, B = 15 %, C = 5 % des ventes.",
            value: (
              <span style={{ display: "inline-flex", gap: 10 }}>
                <span style={{ borderBottom: "2px solid var(--chart-primary)" }}>{compact(abc.A)} {devise === "XAF" ? "FCFA" : devise} A</span>
                <span style={{ borderBottom: "2px solid var(--chart-violet)" }}>{compact(abc.B)} {devise === "XAF" ? "FCFA" : devise} B</span>
                <span style={{ borderBottom: "2px solid var(--chart-cyan)" }}>{compact(abc.C)} {devise === "XAF" ? "FCFA" : devise} C</span>
              </span>
            ) },
        ]}
      />

      <div className="axd-card">
        <IndexFilters views={VUES} sortOptions={[{ key: "date", label: "Date d’ajout" }, { key: "titre", label: "Titre du produit" }, { key: "stock", label: "Stock" }, { key: "ventes", label: "Ventes" }]} />
        <ProductsIndex
          columns={columns}
          rows={rows}
          pagination={total > 0 ? {
            label: `${nombre((page - 1) * PAR_PAGE + 1)}-${nombre(Math.min(page * PAR_PAGE, total))}`,
            previousHref: page > 1 ? lien({ page: String(page - 1) }) : undefined,
            nextHref: page < nbPages ? lien({ page: String(page + 1) }) : undefined,
          } : undefined}
          emptyState={filtre ? (
            <div className="axd-empty">
              <h3>Aucun produit trouvé</h3>
              <p>Essayez de modifier les filtres ou le terme de recherche</p>
              <div className="axd-empty__actions"><Button href="/dashboard/produits">Effacer les filtres</Button></div>
            </div>
          ) : (
            <div className="axd-empty">
              <img src="/visuels/board-produits.webp" alt="" width={200} height={150} style={{ display: "block", margin: "0 auto var(--space-500)" }} />
              <h3>Ajoutez vos produits</h3>
              <p>Commencez par ajouter un premier produit, ou importez votre catalogue depuis un fichier Excel.</p>
              <div className="axd-empty__actions"><Button href="/dashboard/produits/nouveau" variant="primary">Ajouter un produit</Button></div>
            </div>
          )}
        />
      </div>
    </Page>
  );
}
