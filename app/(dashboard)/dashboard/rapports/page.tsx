import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { PAIEMENT } from "@/lib/commandes";
import { redirect } from "next/navigation";
import { formatMontant } from "@/lib/utils";
import { RapportsTutorial } from "@/components/dashboard/tutorials/RapportsTutorial";
import { getT } from "@/lib/i18n/serveur";
import { Card, EmptyState } from "@/components/ui/adm";
import { HorizontalBar } from "@/components/ui/graphiques";
import { variation } from "@/lib/tableau-de-bord";
import { BandeauPeriode } from "../analytics/BandeauPeriode";
import { EnTeteRapports } from "./EnTeteRapports";
import { statutCommande } from "../commandes/statuts";

const PERIODES = [
  { v: "7", l: "7 jours" },
  { v: "30", l: "30 jours" },
  { v: "90", l: "90 jours" },
];

export default async function RapportsPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "produits");
  const tenantId = (session.user as any)?.tenantId;
  if (!tenantId) redirect("/dashboard");

  const { periode: periodeParam } = await searchParams;
  const jours = ["7", "30", "90"].includes(periodeParam ?? "") ? Number(periodeParam) : 30;

  const now = new Date();
  const debutPeriode = new Date(now.getTime() - jours * 24 * 60 * 60 * 1000);
  const debutPrecedente = new Date(now.getTime() - jours * 2 * 24 * 60 * 60 * 1000);

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { nomBoutique: true, devise: true } });
  const devise = tenant?.devise ?? "XAF";

  const [
    aggPeriode, aggPrecedente,
    nouveauxClients, nouveauxClientsPrecedents,
    statutDistribution,
    lignesPeriode,
  ] = await Promise.all([
    prisma.commande.aggregate({
      where: { tenantId, createdAt: { gte: debutPeriode }, paiementStatut: PAIEMENT.PAYE },
      _sum: { montantTotal: true }, _count: true,
    }),
    prisma.commande.aggregate({
      where: { tenantId, createdAt: { gte: debutPrecedente, lt: debutPeriode }, paiementStatut: PAIEMENT.PAYE },
      _sum: { montantTotal: true }, _count: true,
    }),
    prisma.client.count({ where: { tenantId, createdAt: { gte: debutPeriode } } }),
    prisma.client.count({ where: { tenantId, createdAt: { gte: debutPrecedente, lt: debutPeriode } } }),
    prisma.commande.groupBy({
      by: ["statut"],
      where: { tenantId, createdAt: { gte: debutPeriode } },
      _count: true,
    }),
    prisma.ligneCommande.findMany({
      where: { commande: { tenantId, createdAt: { gte: debutPeriode }, statut: { not: "annulee" } } },
      select: { produitId: true, nom: true, prix: true, quantite: true },
    }),
  ]);

  const revenus = aggPeriode._sum.montantTotal ?? 0;
  const revenusPrecedents = aggPrecedente._sum.montantTotal ?? 0;
  const commandes = aggPeriode._count;
  const commandesPrecedentes = aggPrecedente._count;
  const panierMoyen = commandes > 0 ? revenus / commandes : null;
  const panierMoyenPrecedent = commandesPrecedentes > 0 ? revenusPrecedents / commandesPrecedentes : 0;

  const totalStatuts = statutDistribution.reduce((s, d) => s + d._count, 0);
  const annulees = statutDistribution.find(d => d.statut === "annulee")?._count ?? 0;
  const tauxAnnulation = totalStatuts > 0 ? Math.round((annulees / totalStatuts) * 1000) / 10 : 0;

  const parProduit = new Map<string, { nom: string; quantite: number; revenu: number }>();
  for (const l of lignesPeriode) {
    const cur = parProduit.get(l.produitId) ?? { nom: l.nom, quantite: 0, revenu: 0 };
    cur.quantite += l.quantite;
    cur.revenu += l.prix * l.quantite;
    parProduit.set(l.produitId, cur);
  }
  const topProduits = [...parProduit.values()].sort((a, b) => b.revenu - a.revenu).slice(0, 5);

  const metrics = [
    { id: "revenus", label: t("Revenus des commandes payées"), value: formatMontant(revenus, devise), delta: variation(revenus, revenusPrecedents) },
    { id: "commandes", label: t("Commandes payées"), value: commandes.toLocaleString(t.loc), delta: variation(commandes, commandesPrecedentes) },
    { id: "panier", label: t("Panier moyen"), definition: t("Revenus / commandes payées."), value: panierMoyen === null ? "—" : formatMontant(panierMoyen, devise), delta: panierMoyen === null ? null : variation(panierMoyen, panierMoyenPrecedent) },
    { id: "clients", label: t("Nouveaux clients"), value: nouveauxClients.toLocaleString(t.loc), delta: variation(nouveauxClients, nouveauxClientsPrecedents) },
  ];
  const libelle = PERIODES.find((p) => Number(p.v) === jours)!.l;

  return (
    <div className="space-y-4 pb-[120px]">
      <RapportsTutorial />
      <EnTeteRapports sousTitre={`${tenant?.nomBoutique ?? ""} · ${t("comparé aux {0} jours précédents", jours)}`} />
      <p className="hidden print:block text-[15px] font-[650]">{t("Rapport de productivité")} · {tenant?.nomBoutique} · {t(libelle)}</p>

      <BandeauPeriode period={t(libelle)} metrics={metrics} periods={PERIODES.map((p) => ({ id: p.v, label: t(p.l) }))} />

      {statutDistribution.length === 0 ? (
        <EmptyState title={t("Aucune commande sur cette période.")}>{t("Choisissez une période plus longue pour voir vos commandes.")}</EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title={t("Commandes par statut")}>
            <HorizontalBar lignes={[...statutDistribution].sort((a, b) => b._count - a._count).map((s) => ({ libelle: t(statutCommande(s.statut).label), valeur: s._count }))} />
            {annulees > 0 && <p className="mt-3 text-[12px] text-(--color-critical-text)">{t("Taux d'annulation :")} {tauxAnnulation.toLocaleString(t.loc)} %</p>}
          </Card>
          <Card title={t("Top produits vendus")}>
            {topProduits.length === 0 ? (
              <p className="text-(--color-text-secondary)">{t("Aucune vente sur cette période.")}</p>
            ) : (
              <HorizontalBar format="montant" devise={devise} lignes={topProduits.map((p) => ({ libelle: t("{0} · {1} vendu(s)", t(p.nom), p.quantite), valeur: p.revenu }))} />
            )}
            <p className="mt-3 text-[12px] text-(--color-text-secondary)">{t("Commandes non annulées de la période, classées par montant")}</p>
          </Card>
        </div>
      )}

      <p className="hidden text-center text-[12px] text-(--color-text-secondary) print:block">
        {t("Généré le")} {new Date().toLocaleDateString(t.loc, { day: "2-digit", month: "long", year: "numeric" })} {t("· Axso")}
      </p>
    </div>
  );
}
