import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { PAIEMENT } from "@/lib/commandes";
import { redirect } from "next/navigation";
import { formatMontant } from "@/lib/utils";
import Link from "next/link";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Card } from "@/components/dashboard/design-system/components/primitives";
import { Delta } from "@/components/dashboard/design-system/components/MetricsStrip";
import { HorizontalBars } from "@/components/dashboard/design-system/components/Charts";
import { Icon } from "@/components/dashboard/design-system/icons/Icon";
import { PrintButton } from "@/components/dashboard/PrintButton";
import { BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";
import { RapportsTutorial } from "@/components/dashboard/tutorials/RapportsTutorial";
import { getT } from "@/lib/i18n/serveur";

const PERIODES = [
  { v: "7", l: "7 jours" },
  { v: "30", l: "30 jours" },
  { v: "90", l: "90 jours" },
];

const STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente", confirmee: "Confirmée", en_preparation: "En préparation",
  expediee: "Expédiée", livree: "Livrée", tentative_echouee: "Tentative échouée", annulee: "Annulée",
};

// Évolution relative par rapport à la période précédente (0,12 = +12 %), null si incalculable.
function variation(actuel: number, precedent: number): number | null {
  if (precedent === 0) return actuel > 0 ? 1 : null;
  return (actuel - precedent) / precedent;
}

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
  const panierMoyen = commandes > 0 ? revenus / commandes : 0;
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

  const KPIS = [
    { label: "Revenus générés", valeur: formatMontant(revenus, devise), v: variation(revenus, revenusPrecedents), d: "Total des commandes payées sur la période." },
    { label: "Commandes payées", valeur: commandes.toLocaleString(t.loc), v: variation(commandes, commandesPrecedentes), d: "Nombre de commandes payées sur la période." },
    { label: "Panier moyen", valeur: formatMontant(panierMoyen, devise), v: variation(panierMoyen, panierMoyenPrecedent), d: "Revenus divisés par le nombre de commandes payées." },
    { label: "Nouveaux clients", valeur: nouveauxClients.toLocaleString(t.loc), v: variation(nouveauxClients, nouveauxClientsPrecedents), d: "Clients enregistrés pour la première fois sur la période." },
  ];
  const statuts = [...statutDistribution].sort((a, b) => b._count - a._count);

  return (
    <Page>
      <RapportsTutorial />
      <PageHeader
        icon="bars"
        title={<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{t("Rapports")}<span className="print:hidden"><BoutonRevoirTutoriel moduleKey="rapports" /></span></span>}
        extraActions={<span className="print:hidden"><PrintButton /></span>}
      />

      <div className="axd-filters print:hidden">
        <span className="axd-seg">
          {PERIODES.map((p) => (
            <Link key={p.v} href={`/dashboard/rapports?periode=${p.v}`} className="axd-btn axd-btn--sm" aria-current={jours === Number(p.v) ? "page" : undefined}>
              {jours === Number(p.v) && <Icon name="calendar" />}{t(p.l)}
            </Link>
          ))}
        </span>
        <span className="axd-muted" style={{ fontSize: 12 }}>{t("Comparé aux {0} jours précédents", jours)}</span>
      </div>

      <div className="axd-grid axd-g4">
        {KPIS.map((k) => (
          <div key={k.label} className="axd-card axd-card--pad">
            <span className="axd-kpi__t axd-dotted" title={t(k.d)}>{t(k.label)}</span>
            <div className="axd-kpi__v" style={{ marginBottom: 0 }}>{k.valeur} <Delta value={k.v} /></div>
          </div>
        ))}
      </div>

      <div className="axd-grid axd-g2 axd-section">
        <Card title={t("Commandes par statut")}>
          {statuts.length === 0 ? (
            <p className="axd-muted" style={{ textAlign: "center", padding: "32px 0" }}>{t("Aucune commande sur cette période.")}</p>
          ) : (
            <>
              <HorizontalBars items={statuts.map((s) => ({ label: `${t(STATUT_LABELS[s.statut] ?? s.statut)} · ${totalStatuts ? Math.round((s._count / totalStatuts) * 100) : 0} %`, value: s._count }))} format={(v) => v.toLocaleString(t.loc)} />
              {annulees > 0 && <p className="axd-muted" style={{ fontSize: 12, marginTop: 8 }}>{t("Taux d'annulation :")} {tauxAnnulation.toLocaleString(t.loc)} %</p>}
            </>
          )}
        </Card>

        <Card title={t("Produits les plus vendus")} padding="none">
          {topProduits.length === 0 ? (
            <p className="axd-muted" style={{ textAlign: "center", padding: "32px 16px" }}>{t("Aucune vente sur cette période.")}</p>
          ) : (
            <table className="axd-ix" style={{ marginTop: 8 }}>
              <thead><tr><th>{t("Produit")}</th><th className="axd-ix-num">{t("Quantité")}</th><th className="axd-ix-num">{t("Ventes")}</th></tr></thead>
              <tbody>
                {topProduits.map((p, i) => (
                  <tr key={i}>
                    <td className="axd-ix-primary">{t(p.nom)}</td>
                    <td className="axd-ix-num">{p.quantite.toLocaleString(t.loc)}</td>
                    <td className="axd-ix-num">{formatMontant(p.revenu, devise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <p className="axd-muted print:block hidden" style={{ fontSize: 11, textAlign: "center", marginTop: 16 }}>
        {t(tenant?.nomBoutique)} · {t("Généré le")}{" "}{new Date().toLocaleDateString(t.loc, { day: "2-digit", month: "long", year: "numeric" })}
      </p>
    </Page>
  );
}
