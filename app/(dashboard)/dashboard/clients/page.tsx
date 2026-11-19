import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatDate, formatMontant } from "@/lib/utils";
import { MetricsStrip } from "@/components/ui/adm";
import { AgentActiveIndicator } from "@/components/dashboard/AgentActiveIndicator";
import { ClientsTutorial } from "@/components/dashboard/tutorials/ClientsTutorial";
import { getT } from "@/lib/i18n/serveur";
import { PAIEMENT } from "@/lib/commandes";
import { depenseMoyenne, estVip } from "@/lib/segments-clients";
import { EnTeteModule } from "./EnTeteModule";
import { ListeClients, type LigneClient } from "./ListeClients";
import { PAR_PAGE, lireFiltresClients, segmentClient } from "./regles";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "clients");
  const { q, tri, page } = lireFiltresClients(await searchParams);

  const tenantId = (session.user as any)?.tenantId;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { devise: true } });
  if (!tenant) redirect("/inscription");

  // Statistiques par agrégat (une ligne par acheteur) au lieu de charger toutes les commandes.
  // ponytail: groupBy en mémoire, trier sur Client.totalDepense une fois ce champ fiable partout.
  const [totalClients, parClient, moyenne] = await Promise.all([
    prisma.client.count({ where: { tenantId } }),
    prisma.commande.groupBy({
      by: ["clientId"],
      where: { tenantId, clientId: { not: null }, statut: { notIn: ["annulee", "remboursee"] }, paiementStatut: PAIEMENT.PAYE },
      _sum: { montantTotal: true },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    depenseMoyenne(tenantId),
  ]);
  const achats = new Map(parClient.map((g) => [g.clientId as string, { total: g._sum.montantTotal ?? 0, nb: g._count._all, derniere: g._max.createdAt }]));
  const achatsDe = (id: string) => achats.get(id) ?? { total: 0, nb: 0, derniere: null };

  const debut = (page - 1) * PAR_PAGE;
  const recherche = q ? { OR: ["nom", "email", "telephone"].map((k) => ({ [k]: { contains: q, mode: "insensitive" as const } })) } : {};
  let liste;
  let total = totalClients;
  if (tri.colonne === "depense" && !q) {
    // Par dépenses : acheteurs triés, puis les clients sans achat payé, du plus récent au plus ancien.
    const parDepense = [...achats.entries()].sort((x, y) => y[1].total - x[1].total).map(([id]) => id);
    if (tri.ordre === "asc") parDepense.reverse();
    const ids = parDepense.slice(debut, debut + PAR_PAGE);
    const actifs = ids.length ? await prisma.client.findMany({ where: { tenantId, id: { in: ids } } }) : [];
    const reste = PAR_PAGE - ids.length;
    const inactifs = reste > 0 ? await prisma.client.findMany({
      where: { tenantId, id: { notIn: parDepense } }, orderBy: { createdAt: "desc" },
      skip: Math.max(0, debut - parDepense.length), take: reste,
    }) : [];
    const rang = new Map(ids.map((id, i) => [id, i]));
    liste = [...actifs.sort((a, b) => rang.get(a.id)! - rang.get(b.id)!), ...inactifs];
  } else {
    const where = { tenantId, ...recherche };
    const orderBy = tri.colonne === "nom" ? { nom: tri.ordre } : { createdAt: tri.colonne === "inscrit" ? tri.ordre : ("desc" as const) };
    [liste, total] = await Promise.all([
      prisma.client.findMany({ where, orderBy: [orderBy, { id: "desc" as const }], skip: debut, take: PAR_PAGE }),
      prisma.client.count({ where }),
    ]);
    // Recherche triée par dépenses : tri de la page chargée.
    if (tri.colonne === "depense") liste.sort((x, y) => (achatsDe(y.id).total - achatsDe(x.id).total) * (tri.ordre === "asc" ? -1 : 1));
  }

  const lignes: LigneClient[] = liste.map((c) => {
    const a = achatsDe(c.id);
    const seg = segmentClient(a.nb, a.total, moyenne);
    return {
      id: c.id,
      nom: c.nom,
      contact: c.telephone || c.email || "—",
      lieu: [c.ville, c.pays].filter(Boolean).join(", ") || "—",
      commandes: a.nb,
      depense: formatMontant(a.total, tenant.devise),
      segment: { label: t(seg.label), tone: seg.tone },
      derniere: a.derniere ? formatDate(a.derniere) : "—",
    };
  });

  const clientsActifs = parClient.length;
  const totalRevenu = parClient.reduce((s, g) => s + (g._sum.montantTotal ?? 0), 0);
  const vipCount = parClient.filter((g) => estVip(g._count._all, g._sum.montantTotal ?? 0, moyenne)).length;
  const tauxActifs = totalClients > 0 ? Math.round((clientsActifs / totalClients) * 100) : 0;

  return (
    <div className="space-y-4">
      <ClientsTutorial />
      <EnTeteModule
        icon="user"
        title={t("Clients")}
        titleMeta={<AgentActiveIndicator label={t("Agent Clients actif")} />}
        secondaryActions={[{ content: t("Segments"), icon: "users", href: "/dashboard/clients/segments" }]}
        tutoriel="clients"
      />

      {totalClients > 0 && (
        <MetricsStrip period={t("Depuis l'ouverture")} metrics={[
          { id: "total", label: t("Clients"), definition: t("Clients enregistrés dans votre boutique (100 % de votre base clients)."), value: String(totalClients) },
          { id: "actifs", label: t("Clients actifs"), definition: t("Clients avec au moins une commande payée."), value: `${clientsActifs} (${tauxActifs} %)` },
          { id: "vip", label: t("Clients VIP"), definition: t("Au moins 5 commandes, ou une dépense au moins égale à 2 fois la dépense moyenne de vos clients."), value: String(vipCount) },
          { id: "revenu", label: t("Revenu généré"), definition: t("Montant des commandes payées par vos clients, hors annulées et remboursées."), value: formatMontant(totalRevenu, tenant.devise) },
          { id: "moyen", label: t("Revenu moyen par client"), definition: t("Revenu généré divisé par le nombre de clients actifs."), value: formatMontant(clientsActifs ? totalRevenu / clientsActifs : 0, tenant.devise) },
        ]} />
      )}

      <ListeClients lignes={lignes} tri={tri} page={page} total={total} parPage={PAR_PAGE} recherche={!!q} />
    </div>
  );
}
