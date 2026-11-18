import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { PAIEMENT } from "@/lib/commandes";
import { redirect } from "next/navigation";
import { formatMontant } from "@/lib/utils";
import {
  FileBarChart, TrendingUp, TrendingDown, Minus, ShoppingCart, Wallet,
  Users, XCircle,
} from "lucide-react";
import { PrintButton } from "@/components/dashboard/PrintButton";
import { BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";
import { RapportsTutorial } from "@/components/dashboard/tutorials/RapportsTutorial";
import { getT } from "@/lib/i18n/serveur";
import { Badge, EnTetePage, EtatVide } from "@/components/ui";
import { statutCommande } from "../commandes/statuts";

const PERIODES = [
  { v: "7", l: "7 jours" },
  { v: "30", l: "30 jours" },
  { v: "90", l: "90 jours" },
];


// Rien sur la période précédente : pas de pourcentage inventé (« +100 % »), on le dit (comme le Tableau de bord).
function variation(actuel: number, precedent: number): { pct: number; sens: "hausse" | "baisse" | "stable" } | null {
  if (precedent === 0) return null;
  const pct = Math.round(((actuel - precedent) / precedent) * 1000) / 10;
  return { pct: Math.abs(pct), sens: pct > 0.5 ? "hausse" : pct < -0.5 ? "baisse" : "stable" };
}

function VariationBadge({ v, t }: { v: ReturnType<typeof variation>; t: (s: string) => string }) {
  if (!v) return <span className="ax-aide">{t("Pas de comparaison")}</span>;
  const Icon = v.sens === "hausse" ? TrendingUp : v.sens === "baisse" ? TrendingDown : Minus;
  return (
    <Badge ton={v.sens === "hausse" ? "succes" : v.sens === "baisse" ? "erreur" : "neutre"} icone={<Icon aria-hidden />}>
      {v.sens === "hausse" ? "+" : v.sens === "baisse" ? "−" : ""}{v.sens !== "stable" ? `${v.pct} %` : t("stable")}
    </Badge>
  );
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

  const KPIS = [
    { label: "Revenus des commandes payées", valeur: formatMontant(revenus, devise), v: variation(revenus, revenusPrecedents), Icon: Wallet, couleur: "#F5A623" },
    { label: "Commandes payées", valeur: commandes.toLocaleString(t.loc), v: variation(commandes, commandesPrecedentes), Icon: ShoppingCart, couleur: "#3b82f6" },
    { label: "Panier moyen", valeur: panierMoyen === null ? "—" : formatMontant(panierMoyen, devise), v: panierMoyen === null ? null : variation(panierMoyen, panierMoyenPrecedent), Icon: TrendingUp, couleur: "#10b981" },
    { label: "Nouveaux clients", valeur: nouveauxClients.toLocaleString(t.loc), v: variation(nouveauxClients, nouveauxClientsPrecedents), Icon: Users, couleur: "#8b5cf6" },
  ];

  return (
    <div className="space-y-6">
      <RapportsTutorial />
      <EnTetePage className="mb-0 print:block"
        titre={<span className="inline-flex items-center gap-2"><FileBarChart className="size-5 text-attention" aria-hidden />{t("Rapport de productivité")}</span>}
        indicateurs={<span className="print:hidden"><BoutonRevoirTutoriel moduleKey="rapports" /></span>}
        description={<>{t(tenant?.nomBoutique)} · {t(jours)}{" "}{t("derniers jours · comparé aux")}{" "}{t(jours)}{" "}{t("jours précédents")}</>}
        actions={<div className="flex flex-wrap items-center gap-2 print:hidden">
          <nav aria-label={t("Période")} className="flex items-center bg-carte-2 border border-bordure rounded-controle p-1">
            {PERIODES.map(p => (
              <a key={p.v} href={`/dashboard/rapports?periode=${p.v}`} aria-current={jours === Number(p.v) ? "page" : undefined}
                className={`inline-flex min-h-10 items-center px-3 rounded-controle text-sm font-semibold transition-colors ${jours === Number(p.v) ? "bg-carte text-encre shadow-sm" : "text-doux hover:text-encre"}`}>
                {t(p.l)}
              </a>
            ))}
          </nav>
          <PrintButton />
        </div>} />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map(k => (
          <div key={k.label} className="ax-card p-4">
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-8 h-8 rounded-controle flex items-center justify-center bg-carte-2" aria-hidden>
                <k.Icon size={14} style={{ color: k.couleur }} />
              </div>
              <VariationBadge v={k.v} t={t} />
            </div>
            <p className="text-xl font-black text-encre tabular-nums break-words">{t(k.valeur)}</p>
            <p className="ax-aide mt-0.5">{t(k.label)}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Répartition par statut */}
        <div className="ax-card p-5">
          <h2 className="ax-sous-titre mb-4">{t("Commandes par statut")}</h2>
          {statutDistribution.length === 0 ? (
            <EtatVide compact className="border-0" titre={t("Aucune commande sur cette période.")} texte={t("Choisis une période plus longue pour voir tes commandes.")} />
          ) : (
            <div className="space-y-2.5">
              {statutDistribution.sort((a, b) => b._count - a._count).map(s => {
                const pct = totalStatuts > 0 ? Math.round((s._count / totalStatuts) * 100) : 0;
                return (
                  <div key={s.statut}>
                    <div className="flex items-center justify-between mb-1">
                      <Badge ton={statutCommande(s.statut).ton}>{t(statutCommande(s.statut).label)}</Badge>
                      <span className="text-xs font-bold text-encre">{t(s._count)} · {pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-carte-2 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.statut === "annulee" ? "#ef4444" : "#F5A623" }} />
                    </div>
                  </div>
                );
              })}
              {annulees > 0 && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-erreur pt-2">
                  <XCircle size={11} />{" "}{t("Taux d'annulation :")}{" "}{t(tauxAnnulation)}%
                </p>
              )}
            </div>
          )}
        </div>

        {/* Top produits */}
        <div className="ax-card p-5">
          <h2 className="ax-sous-titre">{t("Top produits vendus")}</h2>
          <p className="ax-aide mb-4">{t("Commandes non annulées de la période, classées par montant")}</p>
          {topProduits.length === 0 ? (
            <EtatVide compact className="border-0" titre={t("Aucune vente sur cette période.")} texte={t("Choisis une période plus longue pour voir tes produits vendus.")} />
          ) : (
            <div className="space-y-3">
              {topProduits.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-carte-2 flex items-center justify-center flex-shrink-0 text-xs font-bold text-doux">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-encre truncate">{t(p.nom)}</p>
                    <p className="ax-aide">{t("{0} vendu(s)", p.quantite)}</p>
                  </div>
                  <p className="text-xs font-bold text-encre flex-shrink-0">{formatMontant(p.revenu, devise)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-doux text-center print:block hidden">
        {t("Généré le")}{" "}{new Date().toLocaleDateString(t.loc, { day: "2-digit", month: "long", year: "numeric" })}{" "}{t("· Axso")}
      </p>
    </div>
  );
}
