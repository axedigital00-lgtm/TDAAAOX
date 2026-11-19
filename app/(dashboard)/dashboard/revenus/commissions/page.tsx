import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatMontant, formatDate } from "@/lib/utils";
import { getT } from "@/lib/i18n/serveur";
import { Badge, Banner, Card, EmptyState, MetricsStrip } from "@/components/ui/adm";
import { EnTeteModule } from "../../clients/EnTeteModule";

type Ton = "success" | "attention" | "critical";

const STATUT_COMMISSION: Record<string, { label: string; ton: Ton }> = {
  pending:  { label: "En attente",   ton: "attention" },
  captured: { label: "Capturée",     ton: "success" },
  paid:     { label: "Payée",        ton: "success" },
  disputed: { label: "En litige",    ton: "critical" },
};

export default async function CommissionsPage() {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "finance");

  const tenantId = (session.user as any)?.tenantId;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) redirect("/inscription");

  const commissions = await prisma.commission.findMany({
    where: { tenantId },
    include: { commande: { select: { numero: true, statut: true } } },
    orderBy: { createdAt: "desc" },
  });

  const totalCommissions  = commissions.reduce((s, c) => s + c.montantCommission, 0);
  const capturees         = commissions.filter((c) => c.statut === "captured" || c.statut === "paid").reduce((s, c) => s + c.montantCommission, 0);
  const montantMarchand   = commissions.filter((c) => c.statut === "captured" || c.statut === "paid").reduce((s, c) => s + c.montantMarchand, 0);

  const devise = tenant.devise;
  const cellule = "px-3 py-2 whitespace-nowrap tabular-nums";

  return (
    <div className="space-y-4 pb-[120px]">
      <EnTeteModule backHref="/dashboard/revenus" title={t("Commissions")} />
      <p className="text-(--color-text-secondary)">
        {t("Payé en ligne : +10 % (produit physique) ou +13 % (produit numérique), ajoutés au prix payé par le client, jamais retirés de votre prix. Paiement à la livraison : rien.")}
      </p>

      <MetricsStrip period={t("Depuis l'ouverture")} metrics={[
        { id: "total", label: t("Total commissions Axso"), definition: t("{0} transaction(s) depuis l'ouverture", commissions.length), value: formatMontant(totalCommissions, devise) },
        { id: "part", label: t("Votre part"), definition: t("Ventes dont la commission est capturée ou payée"), value: formatMontant(montantMarchand, devise) },
        { id: "capturees", label: t("Commissions capturées"), definition: t("Livraisons confirmées"), value: formatMontant(capturees, devise) },
      ]} />

      <Banner tone="info" title={t("Comment ça marche ?")}>
        <ol className="mt-1 list-decimal space-y-1 pl-4">
          <li>{t("Le client paie votre prix + 10 % (7 % Axso, 3 % de frais de paiement), ou + 13 % pour un produit numérique (10 % Axso, 3 % de frais de paiement).")}</li>
          <li>{t("Dès que le paiement est confirmé, votre wallet est crédité de votre prix, en entier.")}</li>
          <li>{t("Le client paie votre prix, en espèces : aucune commission, rien n'est prélevé sur votre wallet.")}</li>
        </ol>
      </Banner>

      {commissions.length === 0 ? (
        <EmptyState title={t("Aucune commission")}>
          {t("Une commission apparaît ici pour chaque vente payée en ligne. Les ventes payées à la livraison n'en ont pas.")}
        </EmptyState>
      ) : (
        <Card title={t("Détail des commissions")} padding="none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="h-9 bg-(--color-surface-secondary) text-[12px] font-[550] text-(--color-text-secondary)">
                  {["Commande", "Vente brute", "Commission", "Votre part", "Statut", "Date"].map((h, i) => (
                    <th key={h} scope="col" className={`px-3 whitespace-nowrap ${i >= 1 && i <= 3 ? "text-right" : "text-left"}`}>{t(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => {
                  const st = STATUT_COMMISSION[c.statut] || STATUT_COMMISSION.pending;
                  return (
                    <tr key={c.id} className="border-t border-(--color-border-secondary)">
                      <td className={`${cellule} font-[600] text-(--color-text-strong)`}>{c.commande.numero}</td>
                      <td className={`${cellule} text-right`}>{formatMontant(c.montantCommande, devise)}</td>
                      <td className={`${cellule} text-right`}>{formatMontant(c.montantCommission, devise)}</td>
                      <td className={`${cellule} text-right`}>{formatMontant(c.montantMarchand, devise)}</td>
                      <td className={cellule}><Badge tone={st.ton}>{t(st.label)}</Badge></td>
                      <td className={`${cellule} text-(--color-text-secondary)`}>{formatDate(c.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
