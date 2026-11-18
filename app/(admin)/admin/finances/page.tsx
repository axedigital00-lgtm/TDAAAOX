import { prisma } from "@/lib/prisma";
import { commissionsParBoutiqueXAF, totalCommissionsXAF } from "@/lib/finances-admin";
import { redirect } from "next/navigation";
import { formatMontant, formatDate } from "@/lib/utils";
import { DollarSign, TrendingUp, AlertCircle, Receipt } from "lucide-react";
import { getAdminSessionPour, estAdminComplet } from "@/lib/admin-auth";
import { AdminWalletPanel } from "@/components/admin/AdminWalletPanel";
import { AdminRetraitsManuels } from "@/components/admin/AdminRetraitsManuels";
import { getPlatformTenantId } from "@/lib/wallet";
import { getT } from "@/lib/i18n/serveur";
import Link from "next/link";
import { EnTetePage, Carte, Badge, EtatVide, Progression, type Ton } from "@/components/command-center/ui";

export default async function AdminFinancesPage() {
  const tx = await getT();
  const session = await getAdminSessionPour("finances");
  if (!session) redirect("/admin?refus=1");

  const platformTenantId = await getPlatformTenantId();
  const platformWallet = await prisma.wallet.findUnique({ where: { tenantId: platformTenantId } });

  // Montants de toutes les boutiques convertis en XAF (devise du portefeuille AXSO) — voir lib/finances-admin.ts
  const [parBoutique, revenuPending, fraisPasserelle] = await Promise.all([
    commissionsParBoutiqueXAF({ statut: "captured" }),
    totalCommissionsXAF({ statut: "pending" }),
    prisma.walletTransaction.aggregate({
      _sum: { montant: true },
      // Frais du prestataire de paiement, VENTES seulement : ceux des abonnements (référence SUB-…) ne sont pas prélevés sur la commission.
      where: { walletId: platformWallet?.id, type: "FRAIS", OR: [{ reference: null }, { NOT: { reference: { startsWith: "SUB-" } } }] },
    }),
  ]);

  const topBoutiques = parBoutique.slice(0, 10);
  const tenantIds = topBoutiques.map(t => t.tenantId);
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, nomBoutique: true, slug: true, devise: true },
  });
  const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t]));

  const dernieresCommissions = await prisma.commission.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { tenant: { select: { nomBoutique: true } }, commande: { select: { numero: true, clientNom: true } } },
  });

  const revenuCapture = Math.round(parBoutique.reduce((s, g) => s + g.commissionXAF, 0));
  const fraisTotal = Math.abs(fraisPasserelle._sum.montant || 0);
  const revenuNetReel = Math.max(0, revenuCapture - fraisTotal);

  const STATUT_COMMISSION: Record<string, { nom: string; ton: Ton }> = {
    captured: { nom: "Capturée", ton: "good" },
    remboursee: { nom: "Remboursée", ton: "bad" },
  };
  const badge = (statut: string) => { const s = STATUT_COMMISSION[statut] ?? { nom: "En attente", ton: "warn" as Ton }; return <Badge ton={s.ton}>{tx(s.nom)}</Badge>; };

  return (
    <div className="space-y-5">
      <EnTetePage titre={tx("Finances Axso")} sousTitre={tx("Revenus de commission, abonnements et frais de paiement")} />

      {/* Actions : wallet plateforme et retraits à valider à la main */}
      <AdminWalletPanel peutRetirer={estAdminComplet(session)} />
      <AdminRetraitsManuels peutTraiter={estAdminComplet(session)} />
      <AdminRetraitsManuels peutTraiter={estAdminComplet(session)} livreurs />

      {/* Supervision (lecture seule) */}
      <Carte titre={<span className="flex items-center gap-2"><Receipt size={15} className="cc-warn" aria-hidden />{tx("Ce qu'Axso garde réellement")}</span>}
        sousTitre={tx("Le prestataire de paiement prélève son frais de traitement sur chaque paiement — jamais sur le vendeur, toujours sur la commission Axso.")}>
        <dl className="grid sm:grid-cols-3 gap-4">
          <div>
            <dd className="text-lg font-semibold cc-num">{formatMontant(revenuCapture, "XAF")}</dd>
            <dt className="text-[12px] cc-muted mt-1">{tx("Commission brute (7 % physique, 10 % numérique)")}</dt>
          </div>
          <div>
            <dd className="text-lg font-semibold cc-num cc-bad">−{formatMontant(fraisTotal, "XAF")}</dd>
            <dt className="text-[12px] cc-muted mt-1">{tx("Frais de paiement prélevés")}</dt>
          </div>
          <div>
            <dd className="text-lg font-semibold cc-num cc-good">{formatMontant(revenuNetReel, "XAF")}</dd>
            <dt className="text-[12px] cc-muted mt-1">{tx("Commission nette réelle (dans le wallet)")}</dt>
          </div>
        </dl>
      </Carte>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: "Revenus capturés", value: formatMontant(revenuCapture, "XAF"), icon: TrendingUp, cls: "cc-good", desc: "Commissions libérées" },
          { label: "En attente", value: formatMontant(revenuPending, "XAF"), icon: AlertCircle, cls: "cc-warn", desc: "Libérées après livraison" },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <section key={k.label} className="cc-card p-4">
              <p className="flex items-center gap-2 text-[12px] cc-muted"><Icon size={14} className={k.cls} aria-hidden />{tx(k.label)}</p>
              <p className="text-xl font-semibold cc-num mt-1.5">{k.value}</p>
              <p className="text-[12px] cc-faint mt-1">{tx(k.desc)}</p>
            </section>
          );
        })}
      </div>

      <Carte titre={<span className="flex items-center gap-2"><DollarSign size={15} className="cc-warn" aria-hidden />{tx("Top boutiques par revenus générés")}</span>}>
        {!topBoutiques.length ? <EtatVide titre={tx("Aucune commission capturée pour l'instant.")} explication={tx("Les commissions sont capturées une fois la commande livrée.")} /> : (
          <ol className="space-y-3">
            {topBoutiques.map((t, i) => {
              const tenant = tenantMap[t.tenantId];
              const maxComm = topBoutiques[0].commissionXAF || 1;
              return (
                <li key={t.tenantId} className="flex items-center gap-3">
                  <span className="text-[13px] w-5 text-right cc-faint cc-num">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2 mb-1">
                      <Link href={`/admin/boutiques/${t.tenantId}`} className="text-[13px] truncate hover:underline">{tenant?.nomBoutique ?? t.tenantId}</Link>
                      <span className="text-[13px] font-semibold shrink-0 cc-good cc-num">{formatMontant(t.commission, t.devise)}</span>
                    </div>
                    <Progression valeur={t.commissionXAF / maxComm} />
                    <p className="text-[11.5px] mt-0.5 cc-faint">{tx("Versé au marchand :")} {formatMontant(t.marchand, t.devise)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Carte>

      <Carte titre={tx("Historique des commissions")} sousTitre={tx("Les 20 plus récentes")} pad={false}>
        {!dernieresCommissions.length ? <EtatVide titre={tx("Aucune commission pour l'instant.")} explication={tx("Chaque commande payée en ligne crée une commission ici.")} /> : (
          <>
            <ul className="md:hidden divide-y cc-sep border-t cc-sep">
              {dernieresCommissions.map(c => (
                <li key={c.id} className="p-4 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[12px]" style={{ color: "var(--cc-accent-text)" }}>{c.commande.numero}</p>
                      <p className="text-[13px] font-medium [overflow-wrap:anywhere]">{c.tenant.nomBoutique}</p>
                    </div>
                    {badge(c.statut)}
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-[12px]">
                    <div><dt className="cc-faint">{tx("Commande")}</dt><dd className="cc-num">{formatMontant(c.montantCommande, c.devise)}</dd></div>
                    <div><dt className="cc-faint">{tx("Commission")}</dt><dd className="cc-num cc-good">+{formatMontant(c.montantCommission, c.devise)}</dd></div>
                    <div><dt className="cc-faint">{tx("Marchand")}</dt><dd className="cc-num">{formatMontant(c.montantMarchand, c.devise)}</dd></div>
                  </dl>
                  <p className="text-[11.5px] cc-faint">{c.commande.clientNom} · {formatDate(c.createdAt)}</p>
                </li>
              ))}
            </ul>
            <div className="hidden md:block overflow-x-auto border-t cc-sep">
              <table className="cc-table">
                <thead>
                  <tr>
                    {["Commande", "Boutique", "Client", "Montant commande", "Commission", "Marchand", "Statut", "Date"].map((h, i) => (
                      <th key={h} className={i >= 3 && i <= 5 ? "r" : ""}>{tx(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dernieresCommissions.map(c => (
                    <tr key={c.id}>
                      <td className="font-mono text-[12px]" style={{ color: "var(--cc-accent-text)" }}>{c.commande.numero}</td>
                      <td><Link href={`/admin/boutiques/${c.tenantId}`} className="hover:underline">{c.tenant.nomBoutique}</Link></td>
                      <td className="cc-muted">{c.commande.clientNom}</td>
                      <td className="r cc-num">{formatMontant(c.montantCommande, c.devise)}</td>
                      <td className="r cc-num cc-good">+{formatMontant(c.montantCommission, c.devise)}</td>
                      <td className="r cc-num cc-muted">{formatMontant(c.montantMarchand, c.devise)}</td>
                      <td>{badge(c.statut)}</td>
                      <td className="cc-faint">{formatDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Carte>
    </div>
  );
}
