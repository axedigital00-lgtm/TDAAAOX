// Commandes (MASTERPROMPT §8.2) : en-tête, bande de métriques de la période,
// vues, recherche et table d'index. Filtres, tri et page dans l'URL.
import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { CommandesTutorial } from "@/components/dashboard/tutorials/CommandesTutorial";
import { formatMontant } from "@/lib/utils";
import { PAIEMENT } from "@/lib/commandes";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { MappedBadge, paiementCommande, fulfillmentBadge, deliveryBadge, canalCommande } from "@/components/dashboard/design-system/components/Badge";
import { MetricsStrip } from "@/components/dashboard/design-system/components/MetricsStrip";
import { IndexFilters } from "@/components/dashboard/design-system/components/IndexTable";
import { EmptyState } from "@/components/dashboard/design-system/components/primitives";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { OrdersIndex } from "@/components/dashboard/features/orders/OrdersIndex";
import { dateRelativeAdmin, nombre, variation, bornesPeriode, serie, PERIODES, type Periode } from "@/components/dashboard/design-system/format";

const PAR_PAGE = 50;

const VUES = [
  { id: "toutes", label: "Toutes" },
  { id: "non_traitees", label: "Non traitées" },
  { id: "non_payees", label: "Non payées" },
  { id: "ouvertes", label: "Ouvertes" },
  { id: "archivees", label: "Archivées" },
];

const FILTRES_VUE: Record<string, Prisma.CommandeWhereInput> = {
  non_traitees: { statut: { in: ["en_attente", "confirmee"] } },
  non_payees: { paiementStatut: { not: PAIEMENT.PAYE }, statut: { not: "annulee" } },
  ouvertes: { statut: { notIn: ["livree", "annulee"] } },
  archivees: { statut: { in: ["livree", "annulee"] } },
};
// Anciens liens (?statut=en_attente…) : toujours acceptés.
const STATUTS_HISTORIQUES = ["en_attente", "confirmee", "en_preparation", "expediee", "livree", "annulee", "tentative_echouee"];

const TRIS: Record<string, Prisma.CommandeOrderByWithRelationInput> = {
  "date:desc": { createdAt: "desc" }, "date:asc": { createdAt: "asc" },
  "total:desc": { montantTotal: "desc" }, "total:asc": { montantTotal: "asc" },
  "commande:desc": { numero: "desc" }, "commande:asc": { numero: "asc" },
};

type Params = { view?: string; q?: string; sort?: string; page?: string; periode?: string; statut?: string };

export default async function CommandesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "commandes");
  const sp = await searchParams;
  const tenantId = (session.user as any)?.tenantId as string;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { devise: true } });
  const devise = tenant?.devise || "XAF";

  // ── Filtres de la liste ──
  const vue = VUES.some((v) => v.id === sp.view) ? sp.view! : "toutes";
  const q = sp.q?.trim();
  const sort = sp.sort && TRIS[sp.sort] ? sp.sort : "date:desc";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const where: Prisma.CommandeWhereInput = {
    tenantId,
    ...(FILTRES_VUE[vue] ?? {}),
    ...(sp.statut && STATUTS_HISTORIQUES.includes(sp.statut) ? { statut: sp.statut } : {}),
    ...(q ? { OR: [
      { numero: { contains: q.replace(/^#/, ""), mode: "insensitive" } },
      { clientNom: { contains: q, mode: "insensitive" } },
      { clientTelephone: { contains: q } },
      { ville: { contains: q, mode: "insensitive" } },
    ] } : {}),
  };

  // ── Période des métriques ──
  const periode: Periode = PERIODES.some((p) => p.id === sp.periode) ? (sp.periode as Periode) : "aujourd_hui";
  const b = bornesPeriode(periode);
  const dansPeriode = { gte: b.debut, lt: b.fin };
  const dansPrecedente = { gte: b.precedent.debut, lt: b.precedent.fin };

  const [commandes, total, cmdPeriode, cmdPrecedente, articles, articlesPrec, retours, livrees, livreesPrec] = await Promise.all([
    prisma.commande.findMany({
      where, orderBy: TRIS[sort], skip: (page - 1) * PAR_PAGE, take: PAR_PAGE,
      select: { id: true, numero: true, createdAt: true, clientNom: true, ville: true, canal: true, methodePaiement: true, paiementStatut: true, statut: true, montantTotal: true, devise: true, lignes: { select: { quantite: true } } },
    }),
    prisma.commande.count({ where }),
    prisma.commande.findMany({ where: { tenantId, createdAt: dansPeriode }, select: { createdAt: true, statut: true } }),
    prisma.commande.count({ where: { tenantId, createdAt: dansPrecedente } }),
    prisma.ligneCommande.findMany({ where: { commande: { tenantId, createdAt: dansPeriode } }, select: { quantite: true, commande: { select: { createdAt: true } } } }),
    prisma.ligneCommande.aggregate({ where: { commande: { tenantId, createdAt: dansPrecedente } }, _sum: { quantite: true } }),
    prisma.retourRMA.findMany({ where: { tenantId, createdAt: dansPeriode }, select: { createdAt: true, montant: true } }).catch(() => []),
    prisma.commande.findMany({ where: { tenantId, livreeAt: dansPeriode }, select: { livreeAt: true } }),
    prisma.commande.count({ where: { tenantId, livreeAt: dansPrecedente } }),
  ]);

  const s = (ev: { date: Date; valeur?: number }[]) => serie(ev, b.debut, b.pas, b.points);
  const nbArticles = articles.reduce((t, l) => t + l.quantite, 0);
  const traitees = cmdPeriode.filter((c) => !["en_attente", "confirmee", "annulee"].includes(c.statut));
  const montantRetours = retours.reduce((t, r) => t + (r.montant ?? 0), 0);

  const lien = (maj: Partial<Params>) => {
    const p = new URLSearchParams();
    const tout = { view: vue === "toutes" ? undefined : vue, q, sort: sort === "date:desc" ? undefined : sort, periode: periode === "aujourd_hui" ? undefined : periode, page: undefined as string | undefined, ...maj };
    for (const [k, v] of Object.entries(tout)) if (v) p.set(k, v);
    const str = p.toString();
    return `/dashboard/commandes${str ? `?${str}` : ""}`;
  };
  const nbPages = Math.max(1, Math.ceil(total / PAR_PAGE));
  const debut = total ? (page - 1) * PAR_PAGE + 1 : 0;

  const columns = [
    { id: "commande", header: "Commande", sortKey: "commande", mobilePrimary: true },
    { id: "date", header: "Date", sortKey: "date" },
    { id: "client", header: "Client" },
    { id: "canal", header: "Canal", hideOnMobile: true },
    { id: "total", header: "Total", numeric: true, sortKey: "total" },
    { id: "paiement", header: "Statut du paiement" },
    { id: "traitement", header: "Statut du traitement" },
    { id: "livraison", header: "Statut de la livraison", hideOnMobile: true },
    { id: "articles", header: "Articles", hideOnMobile: true },
    { id: "ville", header: "Ville", hideOnMobile: true },
  ];
  const rows = commandes.map((c) => {
    const nb = c.lignes.reduce((t, l) => t + l.quantite, 0);
    const livraison = deliveryBadge(c.statut);
    return {
      id: c.id,
      href: `/dashboard/commandes/${c.id}`,
      cells: {
        commande: `#${c.numero}`,
        date: dateRelativeAdmin(c.createdAt),
        client: c.clientNom,
        canal: canalCommande(c),
        total: formatMontant(c.montantTotal, c.devise),
        paiement: <MappedBadge {...paiementCommande(c)} />,
        traitement: <MappedBadge {...fulfillmentBadge(c.statut)} />,
        livraison: livraison ? <MappedBadge {...livraison} /> : null,
        articles: `${nb} article${nb > 1 ? "s" : ""}`,
        ville: c.ville,
      },
    };
  });

  const recherche = !!q || vue !== "toutes" || !!sp.statut;
  return (
    <Page>
      <CommandesTutorial />
      <PageHeader
        icon="orders" title="Commandes"
        secondaryActions={[{ content: "Exporter", href: `/api/commandes/export${sp.statut ? `?statut=${sp.statut}` : ""}`, external: true }]}
        primaryAction={{ content: "Créer une commande", href: "/dashboard/pos/caisse" }}
      />

      <MetricsStrip
        periode={periode}
        periodeHref={(p) => lien({ periode: p === "aujourd_hui" ? undefined : p })}
        metrics={[
          { label: "Commandes", definition: "Nombre de commandes passées sur la période.", value: nombre(cmdPeriode.length), delta: variation(cmdPeriode.length, cmdPrecedente), series: s(cmdPeriode.map((c) => ({ date: c.createdAt }))) },
          { label: "Articles commandés", definition: "Quantité totale d’articles dans les commandes de la période.", value: nombre(nbArticles), delta: variation(nbArticles, articlesPrec._sum.quantite ?? 0), series: s(articles.map((l) => ({ date: l.commande.createdAt, valeur: l.quantite }))) },
          { label: "Retours", definition: "Montant des retours ouverts sur la période.", value: formatMontant(montantRetours, devise), series: s(retours.map((r) => ({ date: r.createdAt, valeur: r.montant ?? 0 }))) },
          { label: "Commandes traitées", definition: "Commandes de la période passées en préparation, expédiées ou livrées.", value: nombre(traitees.length), series: s(traitees.map((c) => ({ date: c.createdAt }))) },
          { label: "Commandes livrées", definition: "Commandes livrées au client sur la période.", value: nombre(livrees.length), delta: variation(livrees.length, livreesPrec), series: s(livrees.map((c) => ({ date: c.livreeAt! }))) },
        ]}
      />

      <div className="axd-card">
        <IndexFilters views={VUES} searchPlaceholder="Rechercher et filtrer"
          sortOptions={[{ key: "date", label: "Date" }, { key: "commande", label: "Numéro de commande" }, { key: "total", label: "Total" }]} />
        <OrdersIndex
          columns={columns}
          rows={rows}
          pagination={total > 0 ? {
            label: `${nombre(debut)}-${nombre(Math.min(page * PAR_PAGE, total))}`,
            previousHref: page > 1 ? lien({ page: String(page - 1) }) : undefined,
            nextHref: page < nbPages ? lien({ page: String(page + 1) }) : undefined,
          } : undefined}
          emptyState={recherche ? (
            <div className="axd-empty">
              <h3>Aucune commande trouvée</h3>
              <p>Essayez de modifier les filtres ou le terme de recherche</p>
              <div className="axd-empty__actions"><Button href="/dashboard/commandes">Effacer les filtres</Button></div>
            </div>
          ) : (
            <div className="axd-empty">
              <EmptyArtInline />
              <h3>Vos commandes s’afficheront ici</h3>
              <p>Les commandes passées sur votre boutique, par WhatsApp ou en caisse apparaissent ici en temps réel.</p>
              <div className="axd-empty__actions"><Button href="/dashboard/boutique">Voir ma boutique</Button></div>
            </div>
          )}
        />
      </div>
    </Page>
  );
}

function EmptyArtInline() {
  return <img src="/admin/commandes-vide.svg" alt="" width={200} height={150} style={{ display: "block", margin: "0 auto var(--space-500)" }} />;
}
