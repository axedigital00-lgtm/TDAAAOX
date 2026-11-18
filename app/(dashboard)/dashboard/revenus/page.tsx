// Dashboard Revenus et analytics financières
import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatMontant } from "@/lib/utils";
import Link from "next/link";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, ArrowRight, Wallet } from "lucide-react";
import { AgentActiveIndicator } from "@/components/dashboard/AgentActiveIndicator";
import { BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";
import { RevenusTutorial } from "@/components/dashboard/tutorials/RevenusTutorial";
import { getT } from "@/lib/i18n/serveur";
import { EnTetePage, EtatVide } from "@/components/ui";

export default async function RevenusPage() {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "finance");

  const tenantId = (session.user as any)?.tenantId;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) redirect("/inscription");

  const debut30j = new Date();
  debut30j.setDate(debut30j.getDate() - 30);
  const debut7j = new Date();
  debut7j.setDate(debut7j.getDate() - 7);

  const [commandes30j, commandes7j, commissions] = await Promise.all([
    prisma.commande.findMany({
      where: { tenantId, createdAt: { gte: debut30j }, paiementStatut: "completed" },
      select: { montantTotal: true, createdAt: true },
    }),
    prisma.commande.findMany({
      where: { tenantId, createdAt: { gte: debut7j }, paiementStatut: "completed" },
      select: { montantTotal: true },
    }),
    prisma.commission.findMany({
      where: { tenantId },
      select: { montantCommission: true, createdAt: true },
    }),
  ]);

  const revenu30j       = commandes30j.reduce((s, c) => s + c.montantTotal, 0);
  const revenu7j        = commandes7j.reduce((s, c) => s + c.montantTotal, 0);
  const totalCommissions = commissions.reduce((s, c) => s + c.montantCommission, 0);
  // Le net se calcule sur la même période que le brut (30 jours) : soustraire les commissions
  // de toute l'histoire de la boutique à 30 jours de ventes donnait un chiffre sans période.
  const commissions30j  = commissions.filter((c) => c.createdAt >= debut30j).reduce((s, c) => s + c.montantCommission, 0);
  const revenuNet       = revenu30j - commissions30j;

  // Regrouper par jour (14 derniers jours, dans l'ordre des dates)
  const debut14j = new Date();
  debut14j.setDate(debut14j.getDate() - 14);
  const parJour: Record<string, number> = {};
  commandes30j.forEach((c) => {
    if (c.createdAt < debut14j) return;
    const jour = c.createdAt.toISOString().slice(0, 10);
    parJour[jour] = (parJour[jour] || 0) + c.montantTotal;
  });
  const jours = Object.entries(parJour).sort(([a], [b]) => a.localeCompare(b));
  const maxRevenu = Math.max(...jours.map(([, v]) => v), 1);

  const metriques = [
    {
      label: "Revenu 30 jours",
      value: formatMontant(revenu30j, tenant.devise),
      icon: DollarSign,
      accent: "#F5A623",
      description: "Commandes payées",
    },
    {
      label: "Revenu 7 jours",
      value: formatMontant(revenu7j, tenant.devise),
      icon: TrendingUp,
      accent: "#16A34A",
      description: "Commandes payées des 7 derniers jours",
    },
    {
      label: "Commissions Axso (30 jours)",
      value: formatMontant(commissions30j, tenant.devise),
      icon: TrendingDown,
      accent: "#DC2626",
      description: "Frais de plateforme",
    },
    {
      label: "Revenu net",
      value: formatMontant(Math.max(0, revenuNet), tenant.devise),
      icon: Wallet,
      accent: "#7C3AED",
      description: "Après commissions, sur 30 jours",
    },
  ];

  return (
    <div className="space-y-6">
      <RevenusTutorial />
      <EnTetePage className="mb-0"
        titre={<span className="inline-flex items-center gap-2">{t("Revenus")}{" "}<AgentActiveIndicator label={t("Agent Revenue actif")} /></span>}
        description={t("Analyse financière de votre boutique")}
        indicateurs={<BoutonRevoirTutoriel moduleKey="revenus" />} />

      {/* Hero card */}
      <div className="ax-card p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-carte-2">
            <DollarSign size={20} className="text-[#F5A623]" />
          </div>
          <p className="ax-label">
            {t("Chiffre d'affaires · 30 jours")}{" · "}{t("commandes payées")}
          </p>
        </div>
        <p className="text-3xl md:text-5xl font-bold text-encre mb-2">
          {formatMontant(revenu30j, tenant.devise)}
        </p>
        <p className="text-doux text-sm">
          {t("Revenu net après commissions (30 jours) :")}{" "}
          <span className="font-semibold text-succes">
            {formatMontant(Math.max(0, revenuNet), tenant.devise)}
          </span>
        </p>
      </div>

      {/* 4 metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metriques.map((m, i) => {
          const Icone = m.icon;
          return (
            <div key={i} className="ax-card p-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-carte-2 mb-4">
                <Icone size={16} style={{ color: m.accent }} />
              </div>
              <p className="text-encre text-xl font-bold">{t(m.value)}</p>
              <p className="text-doux text-xs mt-1">{t(m.label)}</p>
              <p className="ax-aide mt-0.5">{t(m.description)}</p>
            </div>
          );
        })}
      </div>

      {/* Graphique barres 14j */}
      <div className="ax-card p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold text-encre">{t("Revenus journaliers")}</h2>
            <p className="ax-aide mt-0.5">{t("14 derniers jours")}{" · "}{t("jours avec au moins une vente payée")}</p>
          </div>
          {jours.length > 0 && (
            <div className="text-right">
              <p className="text-encre font-bold text-lg">
                {formatMontant(jours.reduce((s, [, v]) => s + v, 0), tenant.devise)}
              </p>
              <p className="text-doux text-xs">{t("sur la période")}</p>
            </div>
          )}
        </div>
        {jours.length === 0 ? (
          <EtatVide compact className="border-0" icone={<BarChart3 />} titre={t("Aucune vente payée ces 14 derniers jours")}
            texte={t("Les barres apparaîtront ici à chaque jour de vente payée.")} />
        ) : (
          <div className="flex items-end gap-1 sm:gap-2 h-48">
            {jours.map(([date, revenu]) => {
              const hauteur = Math.max((revenu / maxRevenu) * 100, 3);
              const jour = new Date(date).toLocaleDateString(t.loc, {
                day: "numeric",
                month: "short",
              });
              return (
                <div key={date} className="flex-1 flex flex-col items-center gap-2 group">
                  <div
                    className="relative w-full rounded-t-lg cursor-default"
                    style={{ height: `${hauteur}%`, backgroundColor: "#F5A623", minHeight: "4px", opacity: 0.85 }}
                    title={formatMontant(revenu, tenant.devise)}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#111111] text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      {formatMontant(revenu, tenant.devise)}
                    </div>
                  </div>
                  <span className="hidden sm:block text-doux text-xs text-center leading-tight">{t(jour)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Répartition des revenus */}
      <div className="ax-card p-6">
        <h2 className="text-sm font-semibold text-encre mb-5">{t("Répartition des revenus")}</h2>
        <div className="space-y-1">
          {[
            {
              label: "Revenu brut (30 jours)",
              montant: revenu30j,
              sign: "+",
              signClass: "bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]",
              amountClass: "#F5A623",
              description: "Total des commandes payées",
            },
            {
              label: "Commission Axso (30 jours)",
              montant: commissions30j,
              sign: "−",
              signClass: "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]",
              amountClass: "#DC2626",
              description: "Frais de plateforme prélevés",
            },
            {
              label: "Revenu net",
              montant: Math.max(0, revenuNet),
              sign: "=",
              signClass: "bg-[#ECFDF5] text-[#16A34A] border border-[#BBF7D0]",
              amountClass: "#16A34A",
              description: "Ce que vous empochez",
              highlight: true,
            },
          ].map((ligne) => (
            <div
              key={ligne.label}
              className={`flex items-center justify-between p-4 rounded-xl ${
                ligne.highlight ? "bg-carte-2 border border-bordure" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm border ${ligne.signClass}`}>
                  {t(ligne.sign)}
                </div>
                <div>
                  <p className="text-encre text-sm font-medium">{t(ligne.label)}</p>
                  <p className="text-doux text-xs">{t(ligne.description)}</p>
                </div>
              </div>
              <span className="font-bold text-base" style={{ color: ligne.amountClass }}>
                {formatMontant(ligne.montant, tenant.devise)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation sous-modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/dashboard/revenus/commissions" className="rounded-carte focus-visible:outline-2 focus-visible:outline-focus">
          <div className="ax-card p-6 hover:border-[#D0D0D0] transition-colors group cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-carte-2">
                  <BarChart3 size={18} className="text-[#7C3AED]" />
                </div>
                <div>
                  <p className="text-encre font-semibold text-sm">{t("Commissions")}</p>
                  <p className="text-doux text-sm mt-0.5">{t("Détail des frais Axso prélevés")}</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-doux group-hover:text-encre group-hover:translate-x-0.5 transition-all duration-200" />
            </div>
            <div className="mt-4 pt-4 border-t border-bordure flex items-center justify-between">
              <span className="ax-aide">{t("Total prélevé depuis l'ouverture")}</span>
              <span className="font-bold text-sm text-[#7C3AED]">
                {formatMontant(totalCommissions, tenant.devise)}
              </span>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/analytics" className="rounded-carte focus-visible:outline-2 focus-visible:outline-focus">
          <div className="ax-card p-6 hover:border-[#D0D0D0] transition-colors group cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-carte-2">
                  <TrendingUp size={18} className="text-[#F5A623]" />
                </div>
                <div>
                  <p className="text-encre font-semibold text-sm">{t("Analytics complètes")}</p>
                  <p className="text-doux text-sm mt-0.5">{t("Visites, conversions, entonnoir")}</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-doux group-hover:text-encre group-hover:translate-x-0.5 transition-all duration-200" />
            </div>
            <div className="mt-4 pt-4 border-t border-bordure flex items-center justify-between">
              <span className="text-doux text-xs">{t("Période analysée")}</span>
              <span className="font-bold text-sm text-encre">{t("30 jours")}</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
