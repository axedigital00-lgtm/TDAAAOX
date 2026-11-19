import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MetricsStrip, badgeCommande, badgePaiement } from "@/components/ui/adm";
import { STATUTS_A_TRAITER, STATUTS_PAIEMENT, libelleMethodePaiement } from "./statuts";
import { METHODES_FILTRE, PAR_PAGE, VUES, lireFiltres, orderByCommandes, variation, whereCommandes } from "./filtres";
import { EnTeteCommandes } from "./EnTeteCommandes";
import { ListeCommandes, type LigneCommande } from "./ListeCommandes";
import { CommandesTutorial } from "@/components/dashboard/tutorials/CommandesTutorial";
import { formatMontant, dateRelative } from "@/lib/utils";
import { getT } from "@/lib/i18n/serveur";
import { PAIEMENT } from "@/lib/commandes";

const JOUR = 86_400_000;

export default async function CommandesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "commandes");
  const sp = await searchParams;

  // Ancien lien ?statut=… (tableau de bord, e-mails, Axia) → vue équivalente, sans casser l'URL (D23).
  if (typeof sp.statut === "string") {
    const qs = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" && k !== "statut" ? [[k, v]] : [])));
    if (sp.statut !== "all") qs.set("vue", sp.statut);
    redirect(`/dashboard/commandes${qs.size ? `?${qs}` : ""}`);
  }

  const f = lireFiltres(sp);
  const tenantId = (session.user as any)?.tenantId;
  const where = whereCommandes(tenantId, f);
  const maintenant = Date.now();
  const depuis30 = new Date(maintenant - 30 * JOUR);
  const depuis60 = new Date(maintenant - 60 * JOUR);
  const periode = (gte: Date, lt?: Date) => ({ tenantId, createdAt: { gte, ...(lt ? { lt } : {}) } });

  const [tenant, commandes, totalFiltre, parStatut, nb30, nbAvant, ventes30, ventesAvant, livrees30] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { devise: true, slug: true } }),
    prisma.commande.findMany({
      where,
      include: { lignes: { select: { nom: true, quantite: true } } },
      orderBy: orderByCommandes(f.tri),
      skip: (f.page - 1) * PAR_PAGE,
      take: PAR_PAGE,
    }),
    prisma.commande.count({ where }),
    prisma.commande.groupBy({ by: ["statut"], where: { tenantId }, _count: { _all: true } }),
    prisma.commande.count({ where: periode(depuis30) }),
    prisma.commande.count({ where: periode(depuis60, depuis30) }),
    prisma.commande.aggregate({ where: { ...periode(depuis30), paiementStatut: PAIEMENT.PAYE }, _sum: { montantTotal: true } }),
    prisma.commande.aggregate({ where: { ...periode(depuis60, depuis30), paiementStatut: PAIEMENT.PAYE }, _sum: { montantTotal: true } }),
    prisma.commande.count({ where: { tenantId, livreeAt: { gte: depuis30 } } }),
  ]);

  const devise = tenant?.devise || "XOF";
  const compte = (st: string) => parStatut.find((g) => g.statut === st)?._count._all ?? 0;
  const totalToutes = parStatut.reduce((s, g) => s + g._count._all, 0);
  const aTraiter = STATUTS_A_TRAITER.reduce((s, st) => s + compte(st), 0);

  // Produits de la commande en une ligne : « Robe wax ×2 + 1 autre ».
  const resumeProduits = (lignes: { nom: string; quantite: number }[]) => {
    if (!lignes.length) return "—";
    const [l] = lignes;
    const reste = lignes.length - 1;
    return `${t(l.nom)}${l.quantite > 1 ? ` ×${l.quantite}` : ""}${reste > 0 ? ` + ${reste} ${t(reste > 1 ? "autres" : "autre")}` : ""}`;
  };
  const traduit = (b: ReturnType<typeof badgeCommande>) => ({ ...b, label: t(b.label) });

  const lignes: LigneCommande[] = commandes.map((c) => ({
    id: c.id,
    reference: `#${c.numero?.slice(-6) ?? c.id.slice(-6).toUpperCase()}`,
    date: dateRelative(c.createdAt),
    client: c.clientNom ?? "—",
    lieu: [c.ville, c.pays].filter(Boolean).join(", ") || "—",
    produits: resumeProduits(c.lignes),
    total: formatMontant(c.montantTotal, c.devise),
    methode: t(libelleMethodePaiement(c.methodePaiement)),
    paiement: traduit(badgePaiement(c.paiementStatut, c.methodePaiement)),
    statut: traduit(badgeCommande(c.statut)),
  }));

  const ventes = ventes30._sum.montantTotal ?? 0;
  const filtre = f.statuts.length > 0 || !!f.paiement || !!f.methode || !!f.q;

  return (
    <div className="space-y-4">
      <CommandesTutorial />
      <EnTeteCommandes total={totalToutes} />

      {totalToutes > 0 && (
        <MetricsStrip period={t("30 jours")} metrics={[
          { id: "commandes", label: t("Commandes"), definition: t("Commandes passées sur les 30 derniers jours, comparées aux 30 jours précédents."), value: String(nb30), delta: variation(nb30, nbAvant) },
          { id: "ventes", label: t("Ventes payées"), definition: t("Montant des commandes payées sur les 30 derniers jours."), value: formatMontant(ventes, devise), delta: variation(ventes, ventesAvant._sum.montantTotal ?? 0) },
          { id: "livrees", label: t("Commandes livrées"), definition: t("Commandes passées au statut « Livrée » sur les 30 derniers jours."), value: String(livrees30) },
          { id: "en-livraison", label: t("En livraison"), definition: t("Commandes en cours de livraison, en ce moment."), value: String(compte("expediee")) },
          { id: "a-traiter", label: t("À traiter"), definition: t("Commandes en attente, confirmées, en préparation ou à relivrer, en ce moment."), value: String(aTraiter) },
        ]} />
      )}

      <ListeCommandes
        lignes={lignes}
        vues={VUES.map((v) => ({ id: v.id, label: t(v.label) }))}
        filtres={[
          { key: "paiement", label: t("Statut du paiement"), options: Object.entries(STATUTS_PAIEMENT).map(([value, s]) => ({ value, label: t(s.label) })) },
          { key: "methode", label: t("Moyen de paiement"), options: Object.entries(METHODES_FILTRE).map(([value, m]) => ({ value, label: t(m.label) })) },
        ]}
        tri={f.tri}
        page={f.page}
        total={totalFiltre}
        parPage={PAR_PAGE}
        filtre={filtre}
        urlBoutique={tenant?.slug ?? null}
      />
    </div>
  );
}
