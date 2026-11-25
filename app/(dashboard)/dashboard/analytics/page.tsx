// Analyses de données (MASTERPROMPT §8.17) : période dans l'URL, 4 KPI, ventes
// au fil du temps avec comparaison, ventilation, canaux, visites, produits,
// moyens de paiement, refus à la livraison et entonnoir.
// Palier sans « analytics_avance » : résumé sur 7 jours (règle existante).
import { Traduit, LibelleDefini } from "@/components/dashboard/design-system/components/Traduit";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { exigerModule } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { formatMontant } from "@/lib/utils";
import { planActif } from "@/lib/abonnement";
import { aAcces } from "@/lib/plans";
import { AnalyticsTutorial } from "@/components/dashboard/tutorials/AnalyticsTutorial";
import { UpgradeGate } from "@/components/dashboard/UpgradeGate";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { Banner } from "@/components/dashboard/design-system/components/primitives";
import { Delta, Sparkline } from "@/components/dashboard/design-system/components/MetricsStrip";
import { canalCommande } from "@/components/dashboard/design-system/components/Badge";
import { LineChart, DonutChart, HorizontalBars, KeyValue } from "@/components/dashboard/design-system/components/Charts";
import { Icon } from "@/components/dashboard/design-system/icons/Icon";
import { bornesPeriode, serie, nombre, pourcentage, variation, PERIODES, type Periode } from "@/components/dashboard/design-system/format";

const MOYENS: Record<string, string> = {
  mtn_momo: "MTN MoMo", orange_money: "Orange Money", whatsapp_cod: "À la livraison", direct_cod: "À la livraison", cod: "À la livraison",
  especes: "Espèces", caisse: "Espèces", carte: "Carte", wave: "Wave",
};

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "produits");
  const tenantId = (session.user as any)?.tenantId as string | undefined;
  if (!tenantId) redirect("/dashboard");

  const { plan } = await planActif(tenantId);
  const avance = aAcces(plan, "analytics_avance");
  const sp = await searchParams;
  const demandee: Periode = PERIODES.some((p) => p.id === sp.periode) ? (sp.periode as Periode) : "30j";
  const periode: Periode = avance ? demandee : "7j";
  const b = bornesPeriode(periode);
  const dans = { gte: b.debut, lt: b.fin }, avant = { gte: b.precedent.debut, lt: b.precedent.fin };

  const champs = { createdAt: true, montantTotal: true, montantSousTotal: true, montantReduction: true, montantLivraison: true, statut: true, paiementStatut: true, canal: true, methodePaiement: true, ville: true, clientId: true } as const;
  const [tenant, cmd, cmdPrec, visites, visitesPrec, evenements, lignes, avis] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { devise: true } }),
    prisma.commande.findMany({ where: { tenantId, createdAt: dans }, select: champs }),
    prisma.commande.findMany({ where: { tenantId, createdAt: avant }, select: champs }),
    prisma.analytics.findMany({ where: { tenantId, type: "page_view", date: dans }, select: { date: true, valeur: true } }),
    prisma.analytics.findMany({ where: { tenantId, type: "page_view", date: avant }, select: { date: true, valeur: true } }),
    prisma.analytics.groupBy({ by: ["type"], where: { tenantId, date: dans }, _sum: { valeur: true } }),
    prisma.ligneCommande.findMany({ where: { commande: { tenantId, createdAt: dans, statut: { not: "annulee" } } }, select: { nom: true, prix: true, quantite: true } }),
    prisma.avis.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 4, select: { id: true, note: true, commentaire: true, produit: { select: { nom: true } } } }).catch(() => []),
  ]);
  const devise = tenant?.devise || "XAF";
  const fcfa = devise === "XAF" || devise === "XOF" ? "FCFA" : devise;

  const valides = cmd.filter((c) => c.statut !== "annulee"), validesPrec = cmdPrec.filter((c) => c.statut !== "annulee");
  const payees = valides.filter((c) => c.paiementStatut === "completed"), payeesPrec = validesPrec.filter((c) => c.paiementStatut === "completed");
  const somme = <T,>(l: T[], f: (x: T) => number) => l.reduce((t, x) => t + f(x), 0);
  const brutes = somme(valides, (c) => c.montantSousTotal), brutesPrec = somme(validesPrec, (c) => c.montantSousTotal);
  const reductions = somme(valides, (c) => c.montantReduction), livraison = somme(valides, (c) => c.montantLivraison);
  const totales = somme(valides, (c) => c.montantTotal), totalesPrec = somme(validesPrec, (c) => c.montantTotal);
  const traitees = valides.filter((c) => !["en_attente", "confirmee"].includes(c.statut));
  const traiteesPrec = validesPrec.filter((c) => !["en_attente", "confirmee"].includes(c.statut));
  const recurrents = (l: typeof cmd) => {
    const n = new Map<string, number>();
    for (const c of l) if (c.clientId) n.set(c.clientId, (n.get(c.clientId) ?? 0) + 1);
    return n.size ? ([...n.values()].filter((v) => v > 1).length / n.size) * 100 : 0;
  };
  const tauxRecurrents = recurrents(valides), tauxRecurrentsPrec = recurrents(validesPrec);

  const s = (ev: { date: Date; valeur?: number }[]) => serie(ev, b.debut, b.pas, b.points);
  const sPrec = (ev: { date: Date; valeur?: number }[]) => serie(ev, b.precedent.debut, b.pas, b.points);
  const serieVentes = s(valides.map((c) => ({ date: c.createdAt, valeur: c.montantTotal })));
  const serieVentesPrec = sPrec(validesPrec.map((c) => ({ date: c.createdAt, valeur: c.montantTotal })));
  const serieVisites = s(visites.map((v) => ({ date: v.date, valeur: v.valeur })));
  const serieVisitesPrec = sPrec(visitesPrec.map((v) => ({ date: v.date, valeur: v.valeur })));
  const nbVisites = somme(visites, (v) => v.valeur), nbVisitesPrec = somme(visitesPrec, (v) => v.valeur);

  const libelleJour = (d: Date) => d.toLocaleDateString("fr-FR", { timeZone: "Africa/Douala", day: "numeric", month: "short" });
  const labels = b.points === 24 ? ["00 h", "06 h", "12 h", "18 h"]
    : [0, 0.25, 0.5, 0.75, 1].map((f) => libelleJour(new Date(b.debut.getTime() + f * (b.points - 1) * b.pas)));
  const plage = (d: Date, f: Date) => `${libelleJour(d)} – ${libelleJour(new Date(f.getTime() - 1))}`;
  const legendes: [string, string] = [plage(b.debut, b.fin), plage(b.precedent.debut, b.precedent.fin)];

  const grouper = (l: typeof valides, cle: (c: (typeof valides)[number]) => string, val: (c: (typeof valides)[number]) => number = (c) => c.montantTotal) => {
    const m = new Map<string, number>();
    for (const c of l) m.set(cle(c), (m.get(cle(c)) ?? 0) + val(c));
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  };
  const parCanal = grouper(valides, canalCommande);
  const parMoyen = grouper(valides, (c) => MOYENS[c.methodePaiement] ?? "Autre");
  const parProduit = [...lignes.reduce((m, l) => m.set(l.nom, (m.get(l.nom) ?? 0) + l.prix * l.quantite), new Map<string, number>())]
    .map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  const expediees = cmd.filter((c) => ["livree", "tentative_echouee"].includes(c.statut));
  const refusParVille = grouper(expediees, (c) => c.ville || "Ville inconnue", () => 1).slice(0, 5)
    .map((v) => ({ label: v.label, value: (expediees.filter((c) => (c.ville || "Ville inconnue") === v.label && c.statut === "tentative_echouee").length / v.value) * 100 }));
  const ev = (t: string) => evenements.find((e) => e.type === t)?._sum.valeur ?? 0;
  const entonnoir = [
    { label: "Visites", value: nbVisites },
    { label: "Produits consultés", value: ev("product_view") },
    { label: "Ajouts au panier", value: ev("add_to_cart") },
    { label: "Commandes", value: valides.length },
  ];

  const kpis = [
    { t: "Ventes brutes", d: "Somme des sous-totaux des commandes non annulées.", v: formatMontant(brutes, devise), delta: variation(brutes, brutesPrec), serie: s(valides.map((c) => ({ date: c.createdAt, valeur: c.montantSousTotal }))) },
    { t: "Taux de clients récurrents", d: "Part des clients de la période ayant passé plus d’une commande.", v: pourcentage(tauxRecurrents, 2), delta: tauxRecurrentsPrec ? variation(tauxRecurrents, tauxRecurrentsPrec) : null, serie: undefined },
    { t: "Commandes traitées", d: "Commandes passées en préparation, expédiées ou livrées.", v: nombre(traitees.length), delta: variation(traitees.length, traiteesPrec.length), serie: s(traitees.map((c) => ({ date: c.createdAt }))) },
    { t: "Commandes", d: "Commandes non annulées passées sur la période.", v: nombre(valides.length), delta: variation(valides.length, validesPrec.length), serie: s(valides.map((c) => ({ date: c.createdAt }))) },
  ];
  const heure = new Date().toLocaleTimeString("fr-FR", { timeZone: "Africa/Douala", hour: "2-digit", minute: "2-digit" });

  return (
    <Page>
      <AnalyticsTutorial />
      <PageHeader icon="bars" title="Analyses de données" titleMeta={`Actualisation aujourd’hui à ${heure}`}
        secondaryActions={[{ content: "Vue en direct", href: "/dashboard/analytics/live" }, { content: "Rapports", href: "/dashboard/rapports" }]} />

      {!avance && (
        <div style={{ marginBottom: 14 }}>
          <Banner tone="info" action={<Link href="/dashboard/abonnement" className="axd-btn axd-btn--sm"><Traduit>Voir les forfaits</Traduit></Link>}>
            <Traduit>Votre forfait affiche un résumé sur 7 jours. L’historique complet, l’entonnoir et les analyses par produit sont inclus dans les paliers Pro et Illimité.</Traduit>
          </Banner>
        </div>
      )}

      <div className="axd-filters">
        <span className="axd-seg">
          {PERIODES.map((p) => (
            <Link key={p.id} href={p.id === "30j" ? "/dashboard/analytics" : `/dashboard/analytics?periode=${p.id}`} className="axd-btn axd-btn--sm"
              aria-current={p.id === periode ? "page" : undefined} aria-disabled={!avance && p.id !== "7j" ? true : undefined}>
              {p.id === periode && <Icon name="calendar" />}{p.label}
            </Link>
          ))}
        </span>
        <span className="axd-btn axd-btn--sm" style={{ cursor: "default" }}>{devise === "XAF" ? "FCFA XAF" : devise}</span>
      </div>

      <div className="axd-grid axd-g4">
        {kpis.map((k) => (
          <div key={k.t} className="axd-card axd-card--pad">
            <span className="axd-kpi__t"><LibelleDefini label={k.t} definition={k.d} /></span>
            <div className="axd-kpi__v">{k.v} <Delta value={k.delta} /></div>
            {k.serie && <Sparkline data={k.serie} width={240} height={30} />}
          </div>
        ))}
      </div>

      <div className="axd-grid axd-g21 axd-section">
        <div className="axd-card axd-card--pad">
          <div className="axd-kpi__t"><Traduit>Ventes totales au fil du temps</Traduit></div>
          <div className="axd-kpi__v axd-kpi__v--lg">{formatMontant(totales, devise)} <Delta value={variation(totales, totalesPrec)} /></div>
          <LineChart data={serieVentes} compare={serieVentesPrec} labels={labels} legend={legendes} summary={`Ventes totales : ${formatMontant(totales, devise)} sur la période`} />
        </div>
        <div className="axd-card axd-card--pad">
          <div className="axd-kpi__t" style={{ marginBottom: 6 }}><Traduit>Ventilation des ventes totales</Traduit></div>
          <KeyValue rows={[
            { label: <Link href="/dashboard/rapports" className="axd-btn--plain" style={{ color: "var(--color-link)" }}><Traduit>Ventes brutes</Traduit></Link>, value: formatMontant(brutes, devise) },
            { label: "Réductions", value: formatMontant(reductions ? -reductions : 0, devise) },
            { label: "Ventes nettes", value: formatMontant(brutes - reductions, devise) },
            { label: "Frais de livraison", value: formatMontant(livraison, devise) },
            { label: "Ventes totales", value: formatMontant(totales, devise), strong: true },
            { label: "Dont encaissées", value: formatMontant(somme(payees, (c) => c.montantTotal), devise) },
          ]} />
          <p className="axd-muted" style={{ fontSize: 12, margin: "8px 0 0" }}><Traduit valeurs={[formatMontant(somme(payeesPrec, (c) => c.montantTotal), devise)]}>{"Période précédente : {0} encaissés"}</Traduit></p>
        </div>
      </div>

      {avance ? (
        <>
          <div className="axd-grid axd-g3 axd-section">
            <div className="axd-card axd-card--pad">
              <div className="axd-kpi__t"><Traduit>Ventes par canal</Traduit></div>
              <DonutChart parts={parCanal.length ? parCanal : [{ label: "Aucune vente", value: 0 }]} centre={totales >= 1e3 ? `${nombre(totales / 1e3, 1)} k` : nombre(totales)} unite={fcfa} />
            </div>
            <div className="axd-card axd-card--pad">
              <div className="axd-kpi__t">Visites au fil du temps</div>
              <div className="axd-kpi__v">{nombre(nbVisites)} <Delta value={variation(nbVisites, nbVisitesPrec)} /></div>
              <LineChart data={serieVisites} compare={serieVisitesPrec} labels={[labels[0], labels[labels.length - 1]]} width={380} height={180} summary={`${nombre(nbVisites)} visites sur la période`} />
            </div>
            <div className="axd-card axd-card--pad">
              <div className="axd-kpi__t"><Traduit>Ventes totales par produit</Traduit></div>
              {parProduit.length ? <HorizontalBars items={parProduit} /> : <p className="axd-muted"><Traduit>Aucune vente sur la période.</Traduit></p>}
            </div>
          </div>

          <div className="axd-grid axd-g3 axd-section">
            <div className="axd-card axd-card--pad">
              <div className="axd-kpi__t"><Traduit>Ventes par moyen de paiement</Traduit></div>
              {parMoyen.length ? <HorizontalBars items={parMoyen} /> : <p className="axd-muted"><Traduit>Aucune vente sur la période.</Traduit></p>}
            </div>
            <div className="axd-card axd-card--pad">
              <div className="axd-kpi__t"><Traduit>Taux de refus à la livraison par ville</Traduit></div>
              {refusParVille.length ? <HorizontalBars items={refusParVille} format={(v) => pourcentage(v, 1)} /> : <p className="axd-muted"><Traduit>Aucune livraison terminée sur la période.</Traduit></p>}
            </div>
            <div className="axd-card axd-card--pad">
              <div className="axd-kpi__t">Taux de conversion</div>
              <div className="axd-kpi__v">{nbVisites ? pourcentage((valides.length / nbVisites) * 100, 1) : "—"}</div>
              <HorizontalBars items={entonnoir} format={(v) => nombre(v)} />
            </div>
          </div>

          {avis.length > 0 && (
            <div className="axd-card axd-card--pad axd-section">
              <div className="axd-card__head"><h2 className="axd-card__title"><Traduit>Derniers avis clients</Traduit></h2><Link href="/dashboard/avis" className="axd-btn axd-btn--plain axd-btn--sm">Tout afficher</Link></div>
              {avis.map((a) => (
                <div key={a.id} className="axd-kv"><span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><b>{a.produit?.nom ?? "Boutique"}</b> · {a.commentaire}</span><span className="axd-muted">{a.note}/5</span></div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="axd-section">
          <UpgradeGate titre="Analyses avancées" description="Historique complet, entonnoir de conversion, ventes par canal, par produit et par moyen de paiement sont inclus dans les paliers Pro et Illimité." palierRequis="palier1" />
        </div>
      )}
    </Page>
  );
}
