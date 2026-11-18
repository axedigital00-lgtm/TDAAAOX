import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatMontant, formatDate } from "@/lib/utils";
import { CreditCard, Zap, Crown, AlertTriangle } from "lucide-react";
import { getAdminSessionPour } from "@/lib/admin-auth";
import { PLATFORM_TENANT_SLUG, getPlatformTenantId } from "@/lib/wallet";
import { getT } from "@/lib/i18n/serveur";
import { lireRefAbonnement } from "@/lib/abonnement-paiement";
import { EnTetePage, Carte, EtatVide } from "@/components/command-center/ui";
import { TableauInteractif, type Colonne, type Ligne } from "@/components/command-center/client";
import Link from "next/link";

const PALIERS = [
  { id: "palier0", nom: "Essentiel", prix: 0, icon: CreditCard, cls: "cc-muted" },
  { id: "palier1", nom: "Pro", prix: 6000, icon: Zap, cls: "cc-warn" },
  { id: "palier2", nom: "Illimité", prix: 20000, icon: Crown, cls: "cc-warn" },
];

export default async function AdminAbonnementsPage() {
  const tx = await getT();
  const session = await getAdminSessionPour("abonnements");
  if (!session) redirect("/admin?refus=1");

  const filtreBoutiques = { slug: { not: PLATFORM_TENANT_SLUG } };
  const now = new Date();

  const [repartition, platformTenantId] = await Promise.all([
    prisma.tenant.groupBy({ by: ["planType"], _count: true, where: filtreBoutiques }),
    getPlatformTenantId(),
  ]);

  const platformWallet = await prisma.wallet.findUnique({ where: { tenantId: platformTenantId } });

  const [revenuAbonnementsTotal, revenuAbonnementsMois, abonnesPayants, abonnesExpires] = await Promise.all([
    prisma.walletTransaction.aggregate({
      _sum: { montant: true },
      where: { walletId: platformWallet?.id, description: { startsWith: "Abonnement" } },
    }),
    prisma.walletTransaction.aggregate({
      _sum: { montant: true },
      where: {
        walletId: platformWallet?.id,
        description: { startsWith: "Abonnement" },
        // 1er du mois à 00:00 heure de Douala (UTC+1), pas l'heure du serveur.
        createdAt: { gte: new Date(Date.UTC(new Date(now.getTime() + 3_600_000).getUTCFullYear(), new Date(now.getTime() + 3_600_000).getUTCMonth(), 1) - 3_600_000) },
      },
    }),
    prisma.tenant.findMany({
      where: { ...filtreBoutiques, planType: { in: ["palier1", "palier2"] } },
      select: { id: true, nomBoutique: true, slug: true, planType: true, planExpiresAt: true, devise: true },
      orderBy: { planExpiresAt: "asc" },
    }),
    prisma.tenant.count({
      where: { ...filtreBoutiques, planType: { in: ["palier1", "palier2"] }, planExpiresAt: { lt: now } },
    }),
  ]);

  // Boutiques ayant réellement payé un abonnement en ligne (référence SUB-{tenantId}-…) : un palier peut aussi être attribué par un admin, sans paiement.
  const refsAbonnement = platformWallet ? await prisma.walletTransaction.findMany({ where: { walletId: platformWallet.id, reference: { startsWith: "SUB-" } }, select: { reference: true } }) : [];
  const ontPaye = new Set(refsAbonnement.map((r) => (r.reference ? lireRefAbonnement(r.reference)?.tenantId : undefined)).filter(Boolean));

  // Essai Illimité de 7 jours (lib/essai.ts) : en cours, terminés, transformés en abonnement payé, refusés.
  const essais = await prisma.tenant.findMany({
    where: { ...filtreBoutiques, OR: [{ essaiFinLe: { not: null } }, { essaiStatut: "refuse" }] },
    select: { id: true, nomBoutique: true, essaiFinLe: true, essaiStatut: true },
    orderBy: { essaiFinLe: "asc" },
  });
  const essaisEnCours = essais.filter((e) => e.essaiFinLe && e.essaiFinLe > now);
  const essaisTermines = essais.filter((e) => e.essaiFinLe && e.essaiFinLe <= now);
  const essaisConvertis = essais.filter((e) => e.essaiFinLe && ontPaye.has(e.id)).length;
  const essaisRefuses = essais.filter((e) => !e.essaiFinLe).length;

  const compteParPalier = Object.fromEntries(repartition.map(r => [r.planType, r._count]));
  const totalBoutiques = repartition.reduce((s, r) => s + r._count, 0);

  const tonsStatut = { [tx("Actif")]: "good", [tx("Expiré")]: "bad", [tx("Actif · sans paiement en ligne")]: "info", [tx("Expiré · sans paiement en ligne")]: "bad" };
  const colonnes: Colonne[] = [
    { cle: "boutique", nom: tx("Boutique"), format: "texte" },
    { cle: "palier", nom: tx("Palier"), format: "texte", filtrable: true },
    { cle: "expire", nom: tx("Expire le"), format: "date" },
    { cle: "statut", nom: tx("Statut"), format: "badge", filtrable: true, tons: tonsStatut },
  ];
  const lignes: Ligne[] = abonnesPayants.map((t) => {
    const expire = t.planExpiresAt ? new Date(t.planExpiresAt) < now : false;
    const palier = PALIERS.find(p => p.id === t.planType);
    return {
      _id: t.id, _href: `/admin/boutiques/${t.id}`, boutique: t.nomBoutique, palier: palier ? tx(palier.nom) : t.planType,
      expire: t.planExpiresAt ? t.planExpiresAt.getTime() : null,
      statut: tx(expire ? "Expiré" : "Actif") + (ontPaye.has(t.id) ? "" : tx(" · sans paiement en ligne")),
    };
  });

  return (
    <div className="space-y-5">
      <EnTetePage titre={tx("Abonnements")} sousTitre={tx("Répartition des paliers et revenus récurrents Axso")} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <section className="cc-card p-4">
          <p className="text-[12px] cc-muted">{tx("Revenu abonnements total")}</p>
          <p className="text-2xl font-semibold cc-num cc-good mt-1">{formatMontant(revenuAbonnementsTotal._sum.montant || 0, "XAF")}</p>
        </section>
        <section className="cc-card p-4">
          <p className="text-[12px] cc-muted">{tx("Ce mois-ci")}</p>
          <p className="text-2xl font-semibold cc-num mt-1" style={{ color: "var(--cc-accent-text)" }}>{formatMontant(revenuAbonnementsMois._sum.montant || 0, "XAF")}</p>
        </section>
        <section className="cc-card p-4">
          <p className="text-[12px] cc-muted flex items-center gap-1"><AlertTriangle size={12} className={abonnesExpires ? "cc-bad" : "cc-faint"} aria-hidden />{tx("Abonnements payants expirés")}</p>
          <p className={`text-2xl font-semibold cc-num mt-1 ${abonnesExpires ? "cc-bad" : ""}`}>{abonnesExpires}</p>
        </section>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {PALIERS.map(p => {
          const Icon = p.icon;
          // « gratuit » est l'ancien nom du palier Essentiel : les deux valeurs coexistent en base, on les additionne.
          const count = (compteParPalier[p.id] ?? 0) + (p.id === "palier0" ? (compteParPalier["gratuit"] ?? 0) : 0);
          const pct = totalBoutiques > 0 ? Math.round((count / totalBoutiques) * 100) : 0;
          return (
            <section key={p.id} className="cc-card p-4">
              <p className="flex items-center gap-2 text-[13px] font-medium"><Icon size={14} className={p.cls} aria-hidden />{tx(p.nom)}</p>
              <p className="text-2xl font-semibold cc-num mt-1.5">{count}</p>
              <p className="text-[12px] cc-muted mt-1">{tx("{0} % des boutiques", pct)} · {p.prix > 0 ? tx("{0} FCFA/mois", p.prix.toLocaleString(tx.loc)) : tx("Gratuit")}</p>
            </section>
          );
        })}
      </div>

      <Carte titre={tx("Essais Illimité (7 jours)")}>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {([["En cours", essaisEnCours.length, ""], ["Terminés", essaisTermines.length, "cc-muted"], ["Devenus payants", essaisConvertis, "cc-good"], ["Refusés (pour l'instant)", essaisRefuses, "cc-bad"]] as const).map(([l, n, c]) => (
            <div key={l}><dd className={`text-2xl font-semibold cc-num ${c}`}>{n}</dd><dt className="text-[12px] cc-muted mt-1">{tx(l)}</dt></div>
          ))}
        </dl>
        {essaisEnCours.length > 0 && (
          <ul className="text-[13px] space-y-1 mt-4">
            {essaisEnCours.map((e) => <li key={e.id}><Link href={`/admin/boutiques/${e.id}`} className="hover:underline">{e.nomBoutique}</Link> <span className="cc-muted">— {tx("fin le {0}", formatDate(e.essaiFinLe!))}</span></li>)}
          </ul>
        )}
      </Carte>

      <Carte titre={tx("Boutiques Pro & Illimité")}>
        {!lignes.length
          ? <EtatVide titre={tx("Aucun abonné payant pour l'instant.")} explication={tx("Les boutiques passées en Pro ou Illimité apparaîtront ici avec leur date d'expiration.")} />
          : <TableauInteractif colonnes={colonnes} lignes={lignes} nomExport="abonnes" />}
      </Carte>
    </div>
  );
}
