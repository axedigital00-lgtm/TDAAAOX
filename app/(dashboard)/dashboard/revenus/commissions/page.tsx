import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatMontant, formatDate } from "@/lib/utils";
import { getT } from "@/lib/i18n/serveur";
import { Alerte, Badge, EnTetePage, EtatVide, type Ton } from "@/components/ui";
import { Receipt } from "lucide-react";

const STATUT_COMMISSION: Record<string, { label: string; ton: Ton }> = {
  pending:  { label: "En attente",   ton: "attention" },
  captured: { label: "Capturée",     ton: "succes" },
  paid:     { label: "Payée",        ton: "succes" },
  disputed: { label: "En litige",    ton: "erreur" },
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

  return (
    <div className="space-y-6">
      <EnTetePage className="mb-0"
        retour={{ href: "/dashboard/revenus", libelle: t("Revenus") }}
        titre={t("Commissions")}
        description={t("Payé en ligne : +10 % (produit physique) ou +13 % (produit numérique), ajoutés au prix payé par le client, jamais retirés de votre prix. Paiement à la livraison : rien.")} />

      {/* KPIs commissions */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="ax-card p-5">
          <p className="ax-aide mb-2">{t("Total commissions Axso")}</p>
          <p className="text-xl font-bold text-encre tabular-nums">{formatMontant(totalCommissions, tenant.devise)}</p>
          <p className="ax-aide mt-1">{t("{0} transaction(s) depuis l'ouverture", commissions.length)}</p>
        </div>
        <div className="ax-card p-5">
          <p className="ax-aide mb-2">{t("Votre part")}</p>
          <p className="text-xl font-bold text-succes tabular-nums">{formatMontant(montantMarchand, tenant.devise)}</p>
          <p className="ax-aide mt-1">{t("Ventes dont la commission est capturée ou payée")}</p>
        </div>
        <div className="ax-card p-5 col-span-2 lg:col-span-1">
          <p className="ax-aide mb-2">{t("Commissions capturées")}</p>
          <p className="text-xl font-bold text-encre tabular-nums">{formatMontant(capturees, tenant.devise)}</p>
          <p className="ax-aide mt-1">{t("Livraisons confirmées")}</p>
        </div>
      </div>

      {/* Fonctionnement réel des commissions */}
      <Alerte ton="info" titre={t("Comment ça marche ?")}>
        <div className="mt-2 grid sm:grid-cols-3 gap-3 text-xs">
          {[
            { step: "1. Prix payé en ligne", desc: "Le client paie votre prix + 10 % (7 % Axso, 3 % de frais de paiement), ou + 13 % pour un produit numérique (10 % Axso, 3 % de frais de paiement)." },
            { step: "2. Paiement en ligne", desc: "Dès que le paiement est confirmé, votre wallet est crédité de votre prix, en entier." },
            { step: "3. Paiement à la livraison", desc: "Le client paie votre prix, en espèces : aucune commission, rien n'est prélevé sur votre wallet." },
          ].map((s) => (
            <div key={s.step} className="bg-carte rounded-controle p-3 border border-bordure">
              <p className="text-encre font-semibold mb-1">{t(s.step)}</p>
              <p className="text-doux">{t(s.desc)}</p>
            </div>
          ))}
        </div>
      </Alerte>

      {/* Tableau commissions (défilement horizontal sur téléphone) */}
      <div className="ax-card overflow-hidden">
        <div className="px-5 py-4 border-b border-bordure">
          <h2 className="ax-sous-titre">{t("Détail des commissions")}</h2>
        </div>
        {commissions.length === 0 ? (
          <EtatVide className="m-4" icone={<Receipt />} titre={t("Aucune commission")}
            texte={t("Une commission apparaît ici pour chaque vente payée en ligne. Les ventes payées à la livraison n'en ont pas.")} />
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-bordure bg-carte-2">
                {["Commande", "Vente brute", "Commission", "Votre part", "Statut", "Date"].map((h) => (
                  <th key={h} scope="col" className="text-left text-xs text-doux font-semibold px-5 py-3 whitespace-nowrap">{t(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-bordure">
              {commissions.map((c) => {
                const st = STATUT_COMMISSION[c.statut] || STATUT_COMMISSION.pending;
                return (
                  <tr key={c.id}>
                    <td className="px-5 py-3 text-encre font-mono text-xs whitespace-nowrap">{c.commande.numero}</td>
                    <td className="px-5 py-3 text-encre tabular-nums whitespace-nowrap">{formatMontant(c.montantCommande, tenant.devise)}</td>
                    <td className="px-5 py-3 text-erreur font-semibold tabular-nums whitespace-nowrap">{formatMontant(c.montantCommission, tenant.devise)}</td>
                    <td className="px-5 py-3 text-succes font-semibold tabular-nums whitespace-nowrap">{formatMontant(c.montantMarchand, tenant.devise)}</td>
                    <td className="px-5 py-3"><Badge ton={st.ton}>{t(st.label)}</Badge></td>
                    <td className="px-5 py-3 text-doux whitespace-nowrap">{formatDate(c.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}

