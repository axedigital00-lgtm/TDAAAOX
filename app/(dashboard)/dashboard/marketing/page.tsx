// Croissance (MASTERPROMPT §8.10) : bandeau Stella, performance marketing sur
// 30 jours (ventes générées par les codes promo et les affiliés), canaux,
// raccourcis vers campagnes, e-mails, SMS et affiliation.
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { formatMontant } from "@/lib/utils";
import { MarketingTutorial } from "@/components/dashboard/tutorials/MarketingTutorial";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { LineChart } from "@/components/dashboard/design-system/components/Charts";
import { Delta } from "@/components/dashboard/design-system/components/MetricsStrip";
import { canalCommande } from "@/components/dashboard/design-system/components/Badge";
import { AxiaMark, Icon } from "@/components/dashboard/design-system/icons/Icon";
import { bornesPeriode, serie, nombre, variation } from "@/components/dashboard/design-system/format";

const COULEURS = ["var(--chart-cyan)", "var(--chart-primary)", "var(--chart-violet)", "var(--chart-compare)"];

export default async function CroissancePage() {
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "marketing");
  const tenantId = (session.user as any)?.tenantId as string;

  const b = bornesPeriode("30j");
  const champs = { createdAt: true, montantTotal: true, codePromoId: true, codeAffiliation: true, canal: true, methodePaiement: true } as const;
  const [tenant, cmd, cmdPrec, codesActifs, clients] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { devise: true } }),
    prisma.commande.findMany({ where: { tenantId, createdAt: { gte: b.debut, lt: b.fin }, statut: { not: "annulee" } }, select: champs }),
    prisma.commande.findMany({ where: { tenantId, createdAt: { gte: b.precedent.debut, lt: b.precedent.fin }, statut: { not: "annulee" } }, select: champs }),
    prisma.codePromo.count({ where: { tenantId, actif: true } }),
    prisma.client.count({ where: { tenantId } }),
  ]);
  const devise = tenant?.devise || "XAF";
  const marketing = (c: (typeof cmd)[number]) => !!(c.codePromoId || c.codeAffiliation);
  const somme = (l: typeof cmd) => l.reduce((t, c) => t + c.montantTotal, 0);
  const attribuees = cmd.filter(marketing), attribueesPrec = cmdPrec.filter(marketing);
  const viaPromo = cmd.filter((c) => c.codePromoId), viaAffilies = cmd.filter((c) => c.codeAffiliation);
  const serieMarketing = serie(attribuees.map((c) => ({ date: c.createdAt, valeur: c.montantTotal })), b.debut, b.pas, b.points);
  const jour = (d: Date) => d.toLocaleDateString("fr-FR", { timeZone: "Africa/Douala", day: "numeric", month: "short" });
  const labels = [0, 0.25, 0.5, 0.75, 1].map((f) => jour(new Date(b.debut.getTime() + f * (b.points - 1) * b.pas)));

  const parCanal = [...cmd.reduce((m, c) => m.set(canalCommande(c), (m.get(canalCommande(c)) ?? 0) + 1), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1]);
  const totalCanal = parCanal.reduce((t, [, v]) => t + v, 0);

  return (
    <Page>
      <MarketingTutorial />
      <PageHeader icon="gauge" title="Croissance" />

      <div className="axd-card" style={{ padding: "var(--space-600)" }}>
        <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <h2 style={{ font: "var(--heading-section)", letterSpacing: "-.2px", margin: 0, color: "var(--color-text-strong)" }}>Faites travailler Stella sur votre marketing</h2>
            <p className="axd-muted" style={{ maxWidth: 520, margin: "6px 0 14px" }}>
              Stella analyse vos ventes, votre catalogue et vos clients pour proposer des promotions, des relances WhatsApp et des publications, et vous laisse valider chaque action.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <Link href={`/dashboard?axia=${encodeURIComponent("Propose-moi un plan marketing pour les 30 prochains jours à partir de mes ventes.")}`} className="axd-btn axd-btn--primary">Démarrer</Link>
              <Link href="/dashboard/campagnes" className="axd-btn axd-btn--tint">Voir les campagnes</Link>
            </div>
          </div>
          <div className="axd-hide-m" style={{ width: 200, height: 110, borderRadius: "var(--radius-xl)", background: "var(--color-surface-selected)", display: "grid", placeItems: "center" }}>
            <AxiaMark size={44} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "24px 0 10px" }}>
        <h2 className="axd-card__title" style={{ flex: 1 }}>Performance marketing</h2>
        <span className="axd-btn axd-btn--sm" style={{ cursor: "default" }}><Icon name="calendar" />30 derniers jours</span>
        <Link href="/dashboard/analytics" className="axd-btn axd-btn--plain axd-btn--sm">Afficher les détails</Link>
      </div>

      <div className="axd-card axd-card--pad">
        <div className="axd-kpi__t">Ventes générées par le marketing</div>
        <div style={{ margin: "2px 0 8px" }}>
          <span className="axd-kpi__v axd-kpi__v--lg" style={{ display: "inline-flex", margin: 0 }}>{formatMontant(somme(attribuees), devise)} <Delta value={variation(somme(attribuees), somme(attribueesPrec))} /></span>{" "}
          <span className="axd-muted">sur {formatMontant(somme(cmd), devise)} de ventes totales</span>
        </div>
        <LineChart data={serieMarketing} labels={labels} width={1100} legend={[`${jour(b.debut)} – ${jour(new Date(b.fin.getTime() - 1))}`]} summary={`Ventes générées par le marketing : ${formatMontant(somme(attribuees), devise)}`} />
        <p className="axd-muted" style={{ fontSize: 12, margin: "8px 0 0" }}>Commandes passées avec un code promo ou via un lien d’affilié.</p>
      </div>

      <div className="axd-grid axd-g3 axd-section">
        <div className="axd-card axd-card--pad">
          <div className="axd-kpi__t">Commandes par canal</div>
          <div className="axd-legend" style={{ justifyContent: "flex-start", flexWrap: "wrap", margin: "6px 0" }}>
            {parCanal.map(([l, v], i) => <span key={l}><i style={{ background: COULEURS[i % COULEURS.length] }} />{l} {nombre(v)}</span>)}
            {!parCanal.length && <span>Aucune commande sur la période</span>}
          </div>
          <div style={{ display: "flex", height: 34, borderRadius: 4, overflow: "hidden", marginTop: 12, background: "var(--color-surface-tertiary)" }}>
            {parCanal.map(([l, v], i) => <div key={l} style={{ flex: v / (totalCanal || 1), background: COULEURS[i % COULEURS.length] }} />)}
          </div>
        </div>
        <Link href="/dashboard/marketing/codes-promo" className="axd-card axd-card--pad" style={{ display: "block" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="discount" /><span className="axd-kpi__t" style={{ flex: 1 }}>Codes promo</span><span className="axd-muted" style={{ fontSize: 12 }}>{nombre(codesActifs)} actif{codesActifs > 1 ? "s" : ""}</span></div>
          <div className="axd-kpi__v axd-kpi__v--lg" style={{ marginTop: 22 }}>{formatMontant(somme(viaPromo), devise)}</div>
          <div className="axd-muted" style={{ fontSize: 12 }}>{nombre(viaPromo.length)} commande{viaPromo.length > 1 ? "s" : ""} avec un code</div>
        </Link>
        <Link href="/dashboard/affiliation" className="axd-card axd-card--pad" style={{ display: "block" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="users" /><span className="axd-kpi__t" style={{ flex: 1 }}>Affiliés</span><span className="axd-muted" style={{ fontSize: 12 }}>{nombre(clients)} clients</span></div>
          <div className="axd-kpi__v axd-kpi__v--lg" style={{ marginTop: 22 }}>{formatMontant(somme(viaAffilies), devise)}</div>
          <div className="axd-muted" style={{ fontSize: 12 }}>{nombre(viaAffilies.length)} commande{viaAffilies.length > 1 ? "s" : ""} via un lien d’affilié</div>
        </Link>
      </div>

      <div className="axd-grid axd-g2 axd-section">
        <div className="axd-card axd-card--pad">
          <h2 className="axd-card__title">Campagnes</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <span className="axd-muted" style={{ flex: 1 }}>Pop-ups, relances automatiques et badges pour transformer les visiteurs en clients.</span>
            <Link href="/dashboard/campagnes" className="axd-btn axd-btn--sm">Créer une campagne</Link>
          </div>
        </div>
        <div className="axd-card axd-card--pad">
          <h2 className="axd-card__title">E-mails et SMS</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <span className="axd-muted" style={{ flex: 1 }}>Écrivez à vos clients pour annoncer une nouveauté ou une promotion.</span>
            <Link href="/dashboard/marketing/email" className="axd-btn axd-btn--sm">E-mails</Link>
            <Link href="/dashboard/sms" className="axd-btn axd-btn--sm">SMS</Link>
          </div>
        </div>
      </div>
    </Page>
  );
}
