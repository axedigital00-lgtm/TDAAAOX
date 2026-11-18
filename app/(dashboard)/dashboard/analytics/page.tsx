import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatMontant } from "@/lib/utils";
import { SalesChart } from "@/components/dashboard/SalesChart";
import {
  BarChart3,
  Eye,
  ShoppingCart,
  TrendingUp,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Calendar,
  Package,
} from "lucide-react";
import { AgentActiveIndicator } from "@/components/dashboard/AgentActiveIndicator";
import { UpgradeGate } from "@/components/dashboard/UpgradeGate";
import { LiveRefreshBadge } from "@/components/dashboard/LiveRefreshBadge";
import { planActif } from "@/lib/abonnement";
import { aAcces } from "@/lib/plans";
import { BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";
import { AnalyticsTutorial } from "@/components/dashboard/tutorials/AnalyticsTutorial";
import { getT } from "@/lib/i18n/serveur";
import { variation } from "@/lib/tableau-de-bord";
import { statutCommande } from "../commandes/statuts";
import { Badge, EnTetePage, EtatVide } from "@/components/ui";

export default async function AnalyticsPage() {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "produits");

  const tenantId = (session.user as any)?.tenantId;
  if (!tenantId) redirect("/dashboard");

  const { plan } = await planActif(tenantId);
  const avance = aAcces(plan, "analytics_avance");
  const tempsReel = aAcces(plan, "analytics_temps_reel");

  const now = new Date();
  // Palier 0 : résumé 7 jours uniquement. Palier 1+ : historique complet 30j.
  const fenetre = avance ? 30 : 7;
  const il30Jours = new Date(now.getTime() - fenetre * 24 * 60 * 60 * 1000);
  const il60Jours = new Date(now.getTime() - fenetre * 2 * 24 * 60 * 60 * 1000);

  const [
    commandesPeriode,
    commandesPrecedente,
    analyticsParType,
    analyticsParTypePrecedent,
    topProduits,
    statutDistribution,
    derniersAvis,
    tenant,
    commandesParJour,
  ] = await Promise.all([
    prisma.commande.aggregate({
      where: { tenantId, createdAt: { gte: il30Jours }, paiementStatut: "completed" },
      _sum: { montantTotal: true },
      _count: true,
    }),
    prisma.commande.aggregate({
      where: { tenantId, createdAt: { gte: il60Jours, lt: il30Jours }, paiementStatut: "completed" },
      _sum: { montantTotal: true },
      _count: true,
    }),
    prisma.analytics.groupBy({
      by: ["type"],
      where: { tenantId, date: { gte: il30Jours } },
      _sum: { valeur: true },
    }),
    prisma.analytics.groupBy({
      by: ["type"],
      where: { tenantId, date: { gte: il60Jours, lt: il30Jours } },
      _sum: { valeur: true },
    }),
    prisma.produit.findMany({
      where: { tenantId, actif: true },
      orderBy: { ventes: "desc" },
      take: 8,
    }),
    prisma.commande.groupBy({
      by: ["statut"],
      where: { tenantId },
      _count: true,
    }),
    prisma.avis.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { produit: { select: { nom: true, images: true } } },
    }),
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.commande.findMany({
      where: { tenantId, createdAt: { gte: il30Jours }, paiementStatut: "completed" },
      select: { createdAt: true, montantTotal: true },
    }),
  ]);

  // Graphique jour par jour
  const donneesMap: Record<string, { montant: number; commandes: number }> = {};
  for (let i = 0; i < fenetre; i++) {
    const d = new Date(il30Jours.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toLocaleDateString(t.loc, { day: "2-digit", month: "2-digit" });
    donneesMap[key] = { montant: 0, commandes: 0 };
  }
  for (const c of commandesParJour) {
    const key = new Date(c.createdAt).toLocaleDateString(t.loc, { day: "2-digit", month: "2-digit" });
    if (donneesMap[key]) {
      donneesMap[key].montant += c.montantTotal;
      donneesMap[key].commandes += 1;
    }
  }
  const donnees30Jours = Object.entries(donneesMap).map(([date, v]) => ({ date, ...v }));

  const getVal = (arr: typeof analyticsParType, type: string) =>
    arr.find((a) => a.type === type)?._sum.valeur || 0;

  const pageViews      = getVal(analyticsParType, "page_view");
  const productViews   = getVal(analyticsParType, "product_view");
  const addToCart      = getVal(analyticsParType, "add_to_cart");
  const pageViewsPrev  = getVal(analyticsParTypePrecedent, "page_view");

  const revenuActuel       = commandesPeriode._sum.montantTotal || 0;
  const revenuPrecedent    = commandesPrecedente._sum.montantTotal || 0;
  const commandesActuel    = commandesPeriode._count;
  const commandesPrecedentCount = commandesPrecedente._count;

  // Même règle que le Tableau de bord : sans valeur sur la période précédente, pas de pourcentage
  // inventé (« +100 % ») mais « pas de comparaison possible ».
  const delta = variation;

  const tauxConversion = pageViews > 0 ? ((commandesActuel / pageViews) * 100).toFixed(1) : null;


  const totalCommandes = statutDistribution.reduce((s, x) => s + x._count, 0);

  const kpis = [
    {
      label: "Chiffre d'affaires",
      aide: "Commandes payées",
      valeur: formatMontant(revenuActuel, tenant?.devise || "XOF"),
      delta: delta(revenuActuel, revenuPrecedent),
      accent: "#16A34A",
      icone: TrendingUp,
    },
    {
      label: "Commandes payées",
      aide: "",
      valeur: commandesActuel.toString(),
      delta: delta(commandesActuel, commandesPrecedentCount),
      accent: "#2563EB",
      icone: ShoppingCart,
    },
    {
      label: "Visiteurs",
      aide: "Pages vues de la boutique",
      valeur: Math.round(pageViews).toLocaleString(t.loc),
      delta: delta(pageViews, pageViewsPrev),
      accent: "#F5A623",
      icone: Eye,
    },
    {
      label: "Conversion",
      aide: tauxConversion === null ? "Aucune visite sur la période" : "Commandes payées / visites",
      valeur: tauxConversion === null ? "—" : `${tauxConversion}%`,
      delta: null as number | null,
      accent: "#7C3AED",
      icone: BarChart3,
    },
  ];

  return (
    <div className="space-y-6">
      <AnalyticsTutorial />
      <EnTetePage className="mb-0"
        titre={<span className="inline-flex items-center gap-2">{t("Analytics")}{" "}<AgentActiveIndicator label={t("Agent Analytics actif")} /></span>}
        description={t("Activité réelle de votre boutique")}
        indicateurs={<BoutonRevoirTutoriel moduleKey="analytics" />}
        actions={<>
          <span className="inline-flex min-h-10 items-center gap-2 rounded-controle border border-bordure bg-carte px-3 text-sm text-encre">
            <Calendar className="size-4 text-doux" aria-hidden />
            {t("{0} derniers jours", fenetre)}
            <span className="text-doux">· {t("comparés aux {0} jours d'avant", fenetre)}</span>
          </span>
          {tempsReel && <LiveRefreshBadge intervalMs={30000} />}
        </>} />

      {/* 4 KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => {
          const Icon = k.icone;
          const d = k.delta;
          return (
            <div key={i} className="ax-card p-5 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="w-9 h-9 rounded-controle flex items-center justify-center bg-carte-2" aria-hidden>
                  <Icon size={16} style={{ color: k.accent }} />
                </div>
                {d !== null && (
                  <Badge ton={d > 0 ? "succes" : d < 0 ? "erreur" : "neutre"}
                    icone={d > 0 ? <ArrowUpRight aria-hidden /> : d < 0 ? <ArrowDownRight aria-hidden /> : <Minus aria-hidden />}>
                    {d > 0 ? "+" : d < 0 ? "−" : ""}{Math.abs(d)} %
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold text-encre leading-tight tabular-nums break-words">{t(k.valeur)}</p>
              <p className="ax-libelle mt-1">{t(k.label)}</p>
              {k.aide && <p className="ax-aide">{t(k.aide)}</p>}
              {k.label !== "Conversion" && (
                <p className="ax-aide mt-2 border-t border-bordure pt-2">
                  {d !== null ? t("vs les {0} jours précédents", fenetre) : t("Pas de comparaison possible")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {avance ? (
      <>
      {/* Graphique des ventes */}
      {/* La carte du graphique porte déjà son titre et ses onglets 7/14/30 j. */}
      <SalesChart donnees={donnees30Jours} devise={tenant?.devise || "XOF"} />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top produits */}
        <div className="ax-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-carte-2">
              <TrendingUp size={15} className="text-[#F5A623]" />
            </div>
            <div>
              <h2 className="ax-sous-titre">{t("Top produits")}</h2>
              <p className="ax-aide">{t("Classés par nombre de ventes, depuis l'ouverture de la boutique")}</p>
            </div>
          </div>
          {topProduits.length === 0 ? (
            <EtatVide compact className="border-0" icone={<Package />} titre={t("Aucune vente pour le moment")}
              texte={t("Tes produits les plus vendus apparaîtront ici.")} />
          ) : (
            <div className="space-y-4">
              {topProduits.map((p, i) => {
                const maxVentes = topProduits[0].ventes || 1;
                const pct = Math.round((p.ventes / maxVentes) * 100);
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={
                        i === 0 ? { backgroundColor: "#FFFBEB", color: "#D97706" }
                        : i === 1 ? { backgroundColor: "#F4F4F4", color: "#717171" }
                        : i === 2 ? { backgroundColor: "#FEF2F2", color: "#DC2626" }
                        : { backgroundColor: "#F4F4F4", color: "#717171" }
                      }
                    >
                      {i + 1}
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-carte-2 overflow-hidden flex-shrink-0 border border-bordure">
                      {p.images[0] ? (
                        <img src={p.images[0]} alt={p.nom} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={14} className="text-doux" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-encre text-sm font-medium truncate">{t(p.nom)}</p>
                      <div className="w-full bg-carte-2 rounded-full h-1.5 mt-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: "#F5A623" }} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-encre text-sm font-bold">{t(p.ventes)}</p>
                      <p className="text-doux text-xs">{t("ventes")}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Distribution statuts */}
        <div className="ax-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-carte-2">
              <BarChart3 size={15} className="text-[#2563EB]" />
            </div>
            <div>
              <h2 className="ax-sous-titre">{t("Statuts des commandes")}</h2>
              <p className="text-doux text-xs">{t(totalCommandes)}{" "}{t("commandes au total")}</p>
            </div>
          </div>
          {totalCommandes === 0 ? (
            <EtatVide compact className="border-0" icone={<BarChart3 />} titre={t("Aucune commande pour le moment")}
              texte={t("La répartition par statut apparaîtra dès ta première commande.")} />
          ) : (
            <div className="space-y-3">
              {statutDistribution
                .sort((a, b) => b._count - a._count)
                .map((s) => {
                  const info = statutCommande(s.statut);
                  const pct = Math.round((s._count / totalCommandes) * 100);
                  const barColor = s.statut === "livree" ? "#16A34A"
                    : s.statut === "annulee" ? "#DC2626"
                    : s.statut === "en_attente" ? "#D97706"
                    : s.statut === "confirmee" ? "#2563EB"
                    : "#717171";
                  return (
                    <div key={s.statut}>
                      <div className="flex items-center justify-between mb-1.5">
                        <Badge ton={info.ton}>{t(info.label)}</Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-encre text-sm font-bold">{t(s._count)}</span>
                          <span className="text-doux text-xs">({pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-carte-2 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Entonnoir de conversion */}
      <div className="ax-card p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2 className="ax-sous-titre">{t("Entonnoir de conversion")}</h2>
            <p className="ax-aide mt-0.5">{t("{0} derniers jours", fenetre)}{" · "}{t("en % des visites")}</p>
          </div>
          <div className="flex items-center gap-2 bg-carte-2 border border-bordure rounded-xl px-4 py-2">
            <span className="text-doux text-sm">{t("Taux global")}</span>
            <span className="font-bold text-encre text-lg tabular-nums">{tauxConversion === null ? "—" : `${tauxConversion}%`}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Visites",       val: Math.round(pageViews),    color: "#F5A623" },
            { label: "Vues produits", val: Math.round(productViews), color: "#7C3AED" },
            { label: "Ajouts panier", val: Math.round(addToCart),    color: "#2563EB" },
            { label: "Achats",        val: commandesActuel,          color: "#16A34A" },
          ].map((step, i) => {
            const heightPct = pageViews > 0 ? Math.max(8, (step.val / Math.max(pageViews, 1)) * 100) : 8;
            const ratio = i > 0 && pageViews > 0 ? ((step.val / pageViews) * 100).toFixed(1) : null;
            return (
              <div key={i} className="flex flex-col items-center gap-2">
                <div
                  className="w-full rounded-xl flex items-end justify-center overflow-hidden border border-bordure"
                  style={{ height: "72px", backgroundColor: "#F4F4F4" }}
                >
                  <div
                    className="w-full rounded-b-xl"
                    style={{ height: `${heightPct}%`, backgroundColor: step.color, opacity: 0.4 }}
                  />
                </div>
                <p className="text-encre font-bold text-lg leading-tight">
                  {step.val.toLocaleString(t.loc)}
                </p>
                <p className="text-doux text-xs text-center">{t(step.label)}</p>
                {ratio !== null && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-carte-2 text-doux border border-bordure">
                    {t(ratio)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Derniers avis */}
      {derniersAvis.length > 0 && (
        <div className="ax-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-carte-2">
              <Star size={15} className="text-[#F5A623]" />
            </div>
            <div>
              <h2 className="ax-sous-titre">{t("Derniers avis clients")}</h2>
              <p className="text-doux text-xs">{t("Les 5 plus récents")}</p>
            </div>
          </div>
          <div className="space-y-2">
            {derniersAvis.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-3.5 rounded-xl bg-carte-2 border border-bordure">
                <div className="w-9 h-9 rounded-xl bg-white border border-bordure overflow-hidden flex-shrink-0">
                  {a.produit.images[0] ? (
                    <img src={a.produit.images[0]} alt={a.produit.nom} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={12} className="text-doux" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-doux text-xs truncate mb-1">{t(a.produit.nom)}</p>
                  <div className="flex items-center gap-0.5 mb-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={11}
                        className={i < a.note ? "text-[#F5A623] fill-[#F5A623]" : "text-[#E8E8E8] fill-[#E8E8E8]"}
                      />
                    ))}
                  </div>
                  {a.commentaire && (
                    <p className="text-doux text-xs line-clamp-2">{t(a.commentaire)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </>
      ) : (
        <UpgradeGate
          titre={t("Analytics avancés — Palier 1")}
          description={t("Historique complet, entonnoir de conversion, top produits et avis clients sont réservés aux paliers Pro et Illimité. Le Palier 0 affiche un résumé 7 jours.")}
          palierRequis="palier1"
        />
      )}
    </div>
  );
}
