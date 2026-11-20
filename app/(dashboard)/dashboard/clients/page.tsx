// Clients (MASTERPROMPT §8.9) : récapitulatif de la base, vues, recherche et table.
import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { formatMontant } from "@/lib/utils";
import { ClientsTutorial } from "@/components/dashboard/tutorials/ClientsTutorial";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Badge } from "@/components/dashboard/design-system/components/Badge";
import { IndexFilters, IndexTable } from "@/components/dashboard/design-system/components/IndexTable";
import { Button } from "@/components/dashboard/design-system/components/Button";
import { nombre, debutJour } from "@/components/dashboard/design-system/format";

const PAR_PAGE = 50;
const VUES = [
  { id: "tous", label: "Tous" },
  { id: "fideles", label: "Clients fidèles" },
  { id: "nouveaux", label: "Nouveaux" },
  { id: "sans_commande", label: "Sans commande" },
];
const TRIS: Record<string, Prisma.ClientOrderByWithRelationInput> = {
  "depense:desc": { totalDepense: "desc" }, "depense:asc": { totalDepense: "asc" },
  "commandes:desc": { totalCommandes: "desc" }, "commandes:asc": { totalCommandes: "asc" },
  "date:desc": { createdAt: "desc" }, "date:asc": { createdAt: "asc" },
  "nom:asc": { nom: "asc" }, "nom:desc": { nom: "desc" },
};
type Params = { view?: string; q?: string; sort?: string; page?: string };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "clients");
  const sp = await searchParams;
  const tenantId = (session.user as any)?.tenantId as string;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { devise: true } });
  const devise = tenant?.devise || "XAF";

  const vue = VUES.some((v) => v.id === sp.view) ? sp.view! : "tous";
  const q = sp.q?.trim();
  const sort = sp.sort && TRIS[sp.sort] ? sp.sort : "date:desc";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const filtresVue: Record<string, Prisma.ClientWhereInput> = {
    fideles: { totalCommandes: { gte: 3 } },
    nouveaux: { createdAt: { gte: debutJour(new Date(), -29) } },
    sans_commande: { totalCommandes: 0 },
  };
  const where: Prisma.ClientWhereInput = {
    tenantId, ...(filtresVue[vue] ?? {}),
    ...(q ? { OR: [
      { nom: { contains: q, mode: "insensitive" } }, { telephone: { contains: q } },
      { email: { contains: q, mode: "insensitive" } }, { ville: { contains: q, mode: "insensitive" } },
    ] } : {}),
  };

  const [clients, total, totalBase] = await Promise.all([
    prisma.client.findMany({ where, orderBy: TRIS[sort], skip: (page - 1) * PAR_PAGE, take: PAR_PAGE,
      select: { id: true, nom: true, ville: true, pays: true, totalCommandes: true, totalDepense: true, relancesRefuseesLe: true, telephone: true } }),
    prisma.client.count({ where }),
    prisma.client.count({ where: { tenantId } }),
  ]);

  const lien = (maj: Partial<Params>) => {
    const p = new URLSearchParams();
    const tout = { view: vue === "tous" ? undefined : vue, q, sort: sort === "date:desc" ? undefined : sort, page: undefined as string | undefined, ...maj };
    for (const [k, v] of Object.entries(tout)) if (v) p.set(k, v);
    const s = p.toString();
    return `/dashboard/clients${s ? `?${s}` : ""}`;
  };
  const nbPages = Math.max(1, Math.ceil(total / PAR_PAGE));
  const part = totalBase ? Math.round((total / totalBase) * 100) : 0;

  return (
    <Page>
      <ClientsTutorial />
      <PageHeader icon="user" title="Clients"
        secondaryActions={[{ content: "Avis clients", href: "/dashboard/avis" }]}
        overflowActions={[{ content: "Crédit clients (caisse)", href: "/dashboard/pos/credit" }, { content: "Fidélité (caisse)", href: "/dashboard/pos/fidelite" }]}
      />

      <div className="axd-mstrip">
        <div className="axd-mstrip__m">
          <div className="axd-mstrip__t">{nombre(total)} client{total > 1 ? "s" : ""}</div>
          <div className="axd-mstrip__v"><span className="axd-muted">{part} % de votre base clients</span></div>
        </div>
      </div>

      <div className="axd-card">
        <IndexFilters views={VUES} searchPlaceholder="Rechercher des clients"
          sortOptions={[{ key: "date", label: "Date d’ajout" }, { key: "depense", label: "Montant dépensé" }, { key: "commandes", label: "Commandes" }, { key: "nom", label: "Nom" }]} />
        <IndexTable
          selectable={false}
          columns={[
            { id: "nom", header: "Nom du client", sortKey: "nom", mobilePrimary: true },
            { id: "abonnement", header: "Abonnement aux relances", hideOnMobile: true },
            { id: "emplacement", header: "Emplacement" },
            { id: "commandes", header: "Commandes", sortKey: "commandes" },
            { id: "depense", header: "Montant dépensé", numeric: true, sortKey: "depense" },
          ]}
          rows={clients.map((c) => ({
            id: c.id,
            href: `/dashboard/commandes?q=${encodeURIComponent(c.telephone || c.nom)}`,
            cells: {
              nom: c.nom,
              abonnement: c.relancesRefuseesLe ? <Badge>Non abonné</Badge> : <Badge tone="success">Abonné</Badge>,
              emplacement: [c.ville, c.pays].filter(Boolean).join(", "),
              commandes: `${nombre(c.totalCommandes)} commande${c.totalCommandes > 1 ? "s" : ""}`,
              depense: formatMontant(c.totalDepense, devise),
            },
          }))}
          pagination={total > 0 ? {
            label: `${nombre((page - 1) * PAR_PAGE + 1)}-${nombre(Math.min(page * PAR_PAGE, total))}`,
            previousHref: page > 1 ? lien({ page: String(page - 1) }) : undefined,
            nextHref: page < nbPages ? lien({ page: String(page + 1) }) : undefined,
          } : undefined}
          emptyState={(
            <div className="axd-empty">
              {q || vue !== "tous" ? <>
                <h3>Aucun client trouvé</h3>
                <p>Essayez de modifier les filtres ou le terme de recherche</p>
                <div className="axd-empty__actions"><Button href="/dashboard/clients">Effacer les filtres</Button></div>
              </> : <>
                <img src="/admin/clients-vide.svg" alt="" width={200} height={150} style={{ display: "block", margin: "0 auto var(--space-500)" }} />
                <h3>Vos clients s’afficheront ici</h3>
                <p>Chaque client qui commande sur votre boutique, par WhatsApp ou en caisse est ajouté automatiquement.</p>
              </>}
            </div>
          )}
        />
      </div>
    </Page>
  );
}
