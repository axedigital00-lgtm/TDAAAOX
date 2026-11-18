import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatMontant, formatDate } from "@/lib/utils";
import { ExternalLink, ArrowLeft, BadgeCheck } from "lucide-react";
import { getAdminSessionPour, estAdminComplet } from "@/lib/admin-auth";
import { getWalletResume } from "@/lib/wallet";
import { BoutiqueActionsPanel } from "@/components/admin/BoutiqueActionsPanel";
import { getT } from "@/lib/i18n/serveur";
import { convertirMontant } from "@/lib/devise-convert";
import { tauxDuJour } from "@/lib/taux-change";
import { Carte, Badge, Note } from "@/components/command-center/ui";
import { NOM_STATUT_BOUTIQUE, TON_STATUT_BOUTIQUE } from "../statuts";

export default async function AdminBoutiqueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const session = await getAdminSessionPour("boutiques");
  if (!session) redirect("/admin?refus=1");
  const { id } = await params;

  const taux = await tauxDuJour();
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      _count: { select: { produits: true, commandes: true, clients: true } },
      commissions: { where: { statut: "captured" }, select: { montantCommission: true, devise: true } },
    },
  });
  if (!tenant) notFound();

  const [wallet, badges] = await Promise.all([
    getWalletResume(id),
    prisma.badgeMarchand.findMany({ where: { tenantId: id }, orderBy: { obtenueAt: "desc" }, take: 10 }),
  ]);
  const revenuGenere = tenant.commissions.reduce((s, c) => s + convertirMontant(c.montantCommission, c.devise, tenant.devise, taux), 0); // devise de la commission → devise actuelle de la boutique

  const stats = [
    { label: "Produits", value: tenant._count.produits.toLocaleString(t.loc) },
    { label: "Commandes", value: tenant._count.commandes.toLocaleString(t.loc) },
    { label: "Clients", value: tenant._count.clients.toLocaleString(t.loc) },
    { label: "Revenu Axso généré", value: formatMontant(revenuGenere, tenant.devise), bon: true },
  ];

  return (
    <div className="space-y-5">
      <Link href="/admin/boutiques" className="inline-flex items-center gap-1.5 text-[12.5px] cc-muted hover:underline min-h-[40px] sm:min-h-0">
        <ArrowLeft size={13} aria-hidden />{t("Retour aux boutiques")}
      </Link>

      <header className="flex items-center gap-3 min-w-0">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold shrink-0" style={{ background: "var(--cc-accent-bg)", color: "var(--cc-accent-text)" }} aria-hidden>
          {tenant.nomBoutique.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="cc-h1 flex items-center gap-2 [overflow-wrap:anywhere]">
            {tenant.nomBoutique}
            {tenant.certifie && <BadgeCheck size={18} style={{ color: "var(--cc-accent)" }} aria-label={t("Boutique certifiée")} />}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[12px]">
            <a href={`/${tenant.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline" style={{ color: "var(--cc-accent-text)" }}>
              {t("Voir la vitrine")} ({tenant.slug}) <ExternalLink size={10} aria-hidden />
            </a>
            <Badge ton={TON_STATUT_BOUTIQUE[tenant.statut] ?? "neutre"}>{t(NOM_STATUT_BOUTIQUE[tenant.statut] ?? tenant.statut)}</Badge>
            <span className="cc-faint">{t("Inscrite le")} {formatDate(tenant.createdAt)}</span>
          </div>
        </div>
      </header>

      {/* Supervision (lecture) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="cc-card p-3.5 min-w-0">
            <p className="text-[12px] cc-muted">{t(s.label)}</p>
            <p className={`text-[20px] font-semibold cc-num mt-1 [overflow-wrap:anywhere] ${s.bon ? "cc-good" : ""}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {wallet && (
        <Carte titre={t("Wallet du marchand")}>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><dt className="text-[12px] cc-muted">{t("Solde")}</dt><dd className="text-[18px] font-semibold cc-num" style={{ color: "var(--cc-accent-text)" }}>{formatMontant(wallet.solde, wallet.devise)}</dd></div>
            <div><dt className="text-[12px] cc-muted">{t("Total encaissé")}</dt><dd className="text-[18px] font-semibold cc-num">{formatMontant(wallet.totalRecu, wallet.devise)}</dd></div>
            <div><dt className="text-[12px] cc-muted">{t("Total retiré")}</dt><dd className="text-[18px] font-semibold cc-num">{formatMontant(wallet.totalRetire, wallet.devise)}</dd></div>
          </dl>
        </Carte>
      )}

      {badges.length > 0 && (
        <Carte titre={t("Trophées reçus")}>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => <Badge key={b.id} ton="accent">{b.emoji} {b.titre}</Badge>)}
          </div>
        </Carte>
      )}

      {/* Actions administratives (sensibles), séparées de la supervision */}
      {estAdminComplet(session) ? (
        <BoutiqueActionsPanel tenantId={tenant.id} nomBoutique={tenant.nomBoutique} statut={tenant.statut} planType={tenant.planType} certifie={tenant.certifie} devise={tenant.devise} />
      ) : (
        <Note>{t("Accès en lecture seule : les actions sur la boutique (statut, palier, récompense) sont réservées au Super admin.")}</Note>
      )}
    </div>
  );
}
