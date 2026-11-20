import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exigerModule } from "@/lib/permissions-server";
import { planActif } from "@/lib/abonnement";
import { aAcces } from "@/lib/plans";
import { formatMontant } from "@/lib/utils";
import { getT } from "@/lib/i18n/serveur";
import { UpgradeGate } from "@/components/dashboard/UpgradeGate";
import { Page, PageHeader } from "@/components/dashboard/design-system/components/PageHeader";
import { HorizontalBars } from "@/components/dashboard/design-system/components/Charts";
import { Sparkline } from "@/components/dashboard/design-system/components/MetricsStrip";
import { LiveRefreshBadge } from "@/components/dashboard/LiveRefreshBadge";
import { CarteCommandes } from "@/components/dashboard/features/analytics/CarteCommandes";

export default async function VueEnDirect() {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "produits");
  const tenantId = (session.user as {tenantId?: string}).tenantId;
  if (!tenantId) redirect("/dashboard/accueil");
  const { plan } = await planActif(tenantId);
  const header = <PageHeader icon="bars" title={t("Vue en direct")} secondaryActions={[{ content: t("Analyses de données"), href: "/dashboard/analytics" }]} />;
  if (!aAcces(plan, "analytics_temps_reel")) return <Page>{header}<UpgradeGate titre="Vue en direct" description="Suivez les visites et les commandes de votre boutique en temps réel." /></Page>;

  const fin = new Date(), debut = new Date(+fin - 30 * 60000);
  const filtre = { tenantId, createdAt: { gte: debut, lte: fin }, statut: { not: "annulee" } };
  const [boutique, pages, commandes, produits, sessions, interactions] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { devise: true } }),
    prisma.analytics.findMany({ where: { tenantId, type: "page_view", date: { gte: debut, lte: fin } }, select: { date: true, valeur: true } }),
    prisma.commande.findMany({ where: filtre, select: { createdAt: true, montantTotal: true, ville: true, latitudeClient: true, longitudeClient: true } }),
    prisma.ligneCommande.groupBy({ by: ["nom"], where: { commande: filtre }, _sum: { quantite: true }, orderBy: { _sum: { quantite: "desc" } }, take: 5 }),
    prisma.pixelEvent.findMany({ where: {tenantId, type: "PageView", sessionId: {not: null}, createdAt: {gte: debut, lte: fin}}, select: {sessionId: true, createdAt: true} }),
    prisma.pixelEvent.groupBy({ by: ["type"], where: {tenantId, type: {in:["AddToCart","InitiateCheckout"]}, createdAt: {gte: debut, lte: fin}}, _count: true }),
  ]);
  const visites = Array<number>(30).fill(0), ventes = Array<number>(30).fill(0), volume = Array<number>(30).fill(0);
  const minute = (d: Date) => Math.min(29, Math.floor((+d - +debut) / 60000));
  const villes = new Map<string, { total: number; lat: number; lng: number; gps: number }>();
  for (const p of pages) visites[minute(p.date)] += p.valeur;
  for (const c of commandes) {
    const i = minute(c.createdAt);
    ventes[i] += c.montantTotal; volume[i]++;
    const nom = c.ville?.trim() || t("Ville inconnue");
    const v = villes.get(nom) ?? { total: 0, lat: 0, lng: 0, gps: 0 };
    v.total++;
    if (c.latitudeClient != null && c.longitudeClient != null) { v.lat += c.latitudeClient; v.lng += c.longitudeClient; v.gps++; }
    villes.set(nom, v);
  }
  const somme = (v: number[]) => v.reduce((a, b) => a + b, 0);
  const lieu = Array.from(villes, ([nom,v]) => ({ nom, total: v.total,
    lat: v.gps ? Math.round(v.lat / v.gps * 2) / 2 : null, lng: v.gps ? Math.round(v.lng / v.gps * 2) / 2 : null })).sort((a,b) => b.total - a.total);
  const visiteurs = Array.from({ length: 6 }, (_,i) => {
    const borne = +fin - (5-i)*60000;
    return new Set(sessions.filter(s => +s.createdAt > borne - 300000 && +s.createdAt <= borne).map(s=>s.sessionId)).size;
  });
  const kpis = [
    { label: "Visiteurs en direct", valeur: visiteurs[5], serie: visiteurs },
    { label: "Ventes totales", valeur: formatMontant(somme(ventes), boutique?.devise || "XAF"), serie: ventes },
    { label: "Pages vues sur 30 min", valeur: somme(visites), serie: visites },
    { label: "Commandes", valeur: commandes.length, serie: volume },
  ];
  return <Page>{header}
    <div className="axd-direct-info"><span>{t("30 dernières minutes")} · {fin.toLocaleTimeString(t.loc,{ timeZone:"Africa/Douala", hour:"2-digit",minute:"2-digit" })} (UTC+1)</span><LiveRefreshBadge intervalMs={10000}/></div>
    <CarteCommandes lieux={lieu}><div className="axd-stack">
      <div className="axd-grid axd-g2">{kpis.map(k => <section key={k.label} className="axd-card axd-card--pad"><div className="axd-kpi__t">{t(k.label)}</div>
        <strong className="axd-kpi__v">{typeof k.valeur === "number" ? k.valeur.toLocaleString(t.loc) : k.valeur}</strong><Sparkline data={k.serie} width={100}/></section>)}</div>
      <section className="axd-card axd-card--pad"><h2>{t("Comportement des clients")}</h2>
        <HorizontalBars items={[{ label: t("Ajouts au panier"), value: interactions.find(v=>v.type==="AddToCart")?._count ?? 0 },
          { label: t("Passages au paiement"), value: interactions.find(v=>v.type==="InitiateCheckout")?._count ?? 0 },
          { label: t("Commandes"), value: commandes.length }]} /></section>
      <section className="axd-card axd-card--pad"><h2>{t("Commandes par ville")}</h2>{lieu.length ? <HorizontalBars items={lieu.slice(0,5).map(v=>({label:v.nom,value:v.total}))}/> : <p>{t("Aucune commande sur cette période.")}</p>}</section>
      <section className="axd-card axd-card--pad"><h2>{t("Articles vendus")}</h2>{produits.length ? <HorizontalBars items={produits.map(p=>({label:p.nom,value:p._sum.quantite ?? 0}))}/> : <p>{t("Aucun article vendu sur cette période.")}</p>}</section>
    </div></CarteCommandes>
  </Page>;
}
