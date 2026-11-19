// Revenus : chiffre d'affaires payé, commissions Axso et net, sur 30 jours (commandes payées).
import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatMontant } from "@/lib/utils";
import { RevenusTutorial } from "@/components/dashboard/tutorials/RevenusTutorial";
import { getT } from "@/lib/i18n/serveur";
import { bornesPeriode, courbe } from "@/lib/tableau-de-bord";
import { Card, KeyValue, MetricsStrip, ResourceList, SettingsRow } from "@/components/ui/adm";
import { LineChart } from "@/components/ui/graphiques";
import { EnTeteModule } from "../clients/EnTeteModule";

export default async function RevenusPage() {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "finance");

  const tenantId = (session.user as any)?.tenantId;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { devise: true } });
  if (!tenant) redirect("/inscription");

  const b = bornesPeriode("30j");
  const debut7j = bornesPeriode("7j").debut;
  const [commandes30j, commissions] = await Promise.all([
    prisma.commande.findMany({
      where: { tenantId, createdAt: { gte: b.debut, lt: b.fin }, paiementStatut: "completed" },
      select: { montantTotal: true, createdAt: true, paiementStatut: true },
    }),
    prisma.commission.findMany({ where: { tenantId }, select: { montantCommission: true, createdAt: true } }),
  ]);

  const devise = tenant.devise;
  const revenu30j = commandes30j.reduce((s, c) => s + c.montantTotal, 0);
  const revenu7j = commandes30j.filter((c) => c.createdAt >= debut7j).reduce((s, c) => s + c.montantTotal, 0);
  const totalCommissions = commissions.reduce((s, c) => s + c.montantCommission, 0);
  // Le net se calcule sur la même période que le brut (30 jours).
  const commissions30j = commissions.filter((c) => c.createdAt >= b.debut).reduce((s, c) => s + c.montantCommission, 0);
  const revenuNet = Math.max(0, revenu30j - commissions30j);
  const points = courbe(commandes30j, b, t.loc);

  return (
    <div className="space-y-4 pb-[120px]">
      <RevenusTutorial />
      <EnTeteModule icon="bars" title={t("Revenus")} tutoriel="revenus"
        secondaryActions={[{ content: t("Commissions"), href: "/dashboard/revenus/commissions" }]} />

      <MetricsStrip period={t("30 jours")} metrics={[
        { id: "revenu30", label: t("Revenu 30 jours"), definition: t("Commandes payées des 30 derniers jours."), value: formatMontant(revenu30j, devise), sparkline: points.map((p) => p.montant) },
        { id: "revenu7", label: t("Revenu 7 jours"), definition: t("Commandes payées des 7 derniers jours."), value: formatMontant(revenu7j, devise) },
        { id: "commissions", label: t("Commissions Axso (30 jours)"), definition: t("Frais de plateforme prélevés sur 30 jours."), value: formatMontant(commissions30j, devise) },
        { id: "net", label: t("Revenu net"), definition: t("Après commissions, sur 30 jours."), value: formatMontant(revenuNet, devise) },
      ]} />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card title={t("Revenus journaliers")}>
          <LineChart serie={points.map((p) => p.montant)} libelles={points.map((p) => p.date)} hauteur={220} area devise={devise}
            ariaLabel={t("Revenus des 30 derniers jours : {0}", formatMontant(revenu30j, devise))} />
        </Card>
        <Card title={t("Répartition des revenus")}>
          <KeyValue items={[
            { label: t("Revenu brut (30 jours)"), value: formatMontant(revenu30j, devise) },
            { label: t("Commission Axso (30 jours)"), value: `− ${formatMontant(commissions30j, devise)}` },
            { label: t("Revenu net"), value: formatMontant(revenuNet, devise), strong: true },
          ]} />
          <p className="mt-3 text-[12px] text-(--color-text-secondary)">{t("Ce que vous empochez, sur les commandes payées.")}</p>
        </Card>
      </div>

      <ResourceList>
        <SettingsRow icon="bars" title={t("Commissions")} subtitle={t("Détail des frais Axso prélevés")}
          end={formatMontant(totalCommissions, devise)} href="/dashboard/revenus/commissions" />
        <SettingsRow icon="gauge" title={t("Analyses de données")} subtitle={t("Visites, conversions, entonnoir")} href="/dashboard/analytics" />
      </ResourceList>
    </div>
  );
}
