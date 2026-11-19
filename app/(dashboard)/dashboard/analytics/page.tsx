// Analyses de données (masterprompt §8.17, D7) : tout est calculé sur les données réelles de la boutique ;
// une carte sans donnée est masquée (D4). Les blocs du Tableau de bord (ventes en cours, derniers clients,
// top produits et villes, Mon argent) sont repris ici avec les mêmes requêtes (accueil/donnees.ts).
import { auth } from "@/lib/auth";
import { exigerModule, permissionsSession } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatMontant } from "@/lib/utils";
import { PAIEMENT } from "@/lib/commandes";
import { UpgradeGate } from "@/components/dashboard/UpgradeGate";
import { LiveRefreshBadge } from "@/components/dashboard/LiveRefreshBadge";
import { AnalyticsTutorial } from "@/components/dashboard/tutorials/AnalyticsTutorial";
import { DerniersClients, MonArgent, TopProduitsVilles, VentesEnCours } from "@/components/dashboard/tableau-de-bord/Sections";
import { planActif } from "@/lib/abonnement";
import { aAcces } from "@/lib/plans";
import { soldeDisponible } from "@/lib/wallet";
import { getT } from "@/lib/i18n/serveur";
import { LIBELLES_PERIODE, PERIODES, bornesPeriode, courbe, indicateurs, lirePeriode, variation, type Intervalle } from "@/lib/tableau-de-bord";
import { Card, KeyValue } from "@/components/ui/adm";
import { DonutChart, FunnelChart, HorizontalBar, LineChart } from "@/components/ui/graphiques";
import { statutCommande, libelleMethodePaiement } from "../commandes/statuts";
import { EnTeteModule } from "../clients/EnTeteModule";
import { chargerDerniersClients, chargerPeriode, chargerTopProduitsVilles, chargerVentesEnCours } from "../accueil/donnees";
import { BandeauPeriode } from "./BandeauPeriode";
import { aligner, bornesPrecedentes, echecsParVille, ventilation } from "./regles";

const COD = ["whatsapp_cod", "direct_cod"];

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");
  await exigerModule(session, "produits");
  const tenantId = (session.user as any)?.tenantId as string | undefined;
  if (!tenantId) redirect("/dashboard");

  const { plan } = await planActif(tenantId);
  const avance = aAcces(plan, "analytics_avance");
  const tempsReel = aAcces(plan, "analytics_temps_reel");
  // Palier 0 : résumé 7 jours uniquement (règle existante). Palier 1+ : toutes les périodes.
  const periode = avance ? lirePeriode((await searchParams).periode) : "7j";
  const b = bornesPeriode(periode);
  const dans = (i: Intervalle) => ({ gte: i.debut, lt: i.fin });
  const perms = await permissionsSession(session);
  const voit = (m: keyof typeof perms) => perms[m] !== "aucun";
  const voitFinance = voit("finance");
  const payeesPeriode = { tenantId, paiementStatut: PAIEMENT.PAYE, statut: { not: "annulee" }, createdAt: dans(b) };

  const [tenant, { cmds, cmdsPrec, visites, visitesPrec }, evenements, sommes, parMoyen, livraisonsCod, statuts, avis, enCours, top, argent] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { devise: true, pays: true } }),
    chargerPeriode(tenantId, b),
    avance ? prisma.analytics.groupBy({ by: ["type"], where: { tenantId, date: dans(b), type: { in: ["product_view", "add_to_cart"] } }, _sum: { valeur: true } }) : [],
    avance && voitFinance ? prisma.commande.aggregate({ where: payeesPeriode, _sum: { montantSousTotal: true, montantReduction: true, montantLivraison: true, montantTaxes: true, montantTotal: true } }) : null,
    avance && voitFinance ? prisma.commande.groupBy({ by: ["methodePaiement"], where: payeesPeriode, _sum: { montantTotal: true } }) : [],
    avance ? prisma.commande.findMany({ where: { tenantId, methodePaiement: { in: COD }, createdAt: dans(b) }, select: { ville: true, methodePaiement: true, statut: true, expedieeAt: true } }) : [],
    avance ? prisma.commande.groupBy({ by: ["statut"], where: { tenantId }, _count: true }) : [],
    avance ? prisma.avis.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 5, include: { produit: { select: { nom: true } } } }) : [],
    avance && voit("commandes") ? chargerVentesEnCours(tenantId) : null,
    avance && voit("commandes") ? chargerTopProduitsVilles(tenantId, b) : null,
    avance && voitFinance ? soldeDisponible(tenantId).catch(() => null) : null,
  ]);
  const clients = avance && voit("clients") ? await chargerDerniersClients(tenantId, tenant?.pays) : [];

  const devise = tenant?.devise || "XOF";
  const montant = (v: number) => (voitFinance ? formatMontant(v, devise) : "—");
  const ind = indicateurs(cmds, visites);
  const prec = indicateurs(cmdsPrec, visitesPrec);
  const points = courbe(cmds, b, t.loc);
  const pointsPrec = aligner(courbe(cmdsPrec, bornesPrecedentes(b), t.loc).map((p) => p.montant), points.length);
  const pct = (v: number | null) => (v === null ? "—" : `${v.toLocaleString(t.loc, { maximumFractionDigits: 1 })} %`);
  const libellePeriode = t(LIBELLES_PERIODE[periode]);

  const metrics = [
    ...(voitFinance ? [{ id: "ventes", label: t("Ventes totales"), definition: t("Montant des commandes payées sur la période, comparé à la période précédente."), value: formatMontant(ind.chiffreAffaires, devise), delta: variation(ind.chiffreAffaires, prec.chiffreAffaires), sparkline: points.map((p) => p.montant) }] : []),
    { id: "commandes", label: t("Commandes"), definition: t("Commandes non annulées de la période (en ligne et en caisse)."), value: ind.commandes.toLocaleString(t.loc), delta: variation(ind.commandes, prec.commandes), sparkline: points.map((p) => p.commandes) },
    ...(voitFinance ? [{ id: "panier", label: t("Panier moyen"), definition: t("Ventes totales / commandes payées."), value: ind.panierMoyen === null ? "—" : formatMontant(ind.panierMoyen, devise), delta: variation(ind.panierMoyen, prec.panierMoyen) }] : []),
    { id: "visites", label: t("Visites"), definition: t("Pages vues de la boutique en ligne."), value: Math.round(ind.visiteurs).toLocaleString(t.loc), delta: variation(ind.visiteurs, prec.visiteurs) },
    { id: "conversion", label: t("Taux de conversion"), definition: t("Commandes en ligne / visites de la boutique."), value: pct(ind.conversion), delta: variation(ind.conversion, prec.conversion) },
  ];

  const evt = (type: string) => evenements.find((e) => e.type === type)?._sum.valeur ?? 0;
  const enLigne = cmds.filter((c) => (c.canal ?? "en_ligne") === "en_ligne").length;
  const lignesVentilation = sommes ? ventilation({
    sousTotal: sommes._sum.montantSousTotal ?? 0, reduction: sommes._sum.montantReduction ?? 0, livraison: sommes._sum.montantLivraison ?? 0,
    taxes: sommes._sum.montantTaxes ?? 0, total: sommes._sum.montantTotal ?? 0,
  }) : [];
  const moyens = parMoyen.filter((m) => (m._sum.montantTotal ?? 0) > 0).map((m) => ({ libelle: t(libelleMethodePaiement(m.methodePaiement)), valeur: m._sum.montantTotal ?? 0 }));
  const echecs = echecsParVille(livraisonsCod);
  const totalStatuts = statuts.reduce((s, x) => s + x._count, 0);

  return (
    <div className="space-y-4 pb-[120px]">
      <AnalyticsTutorial />
      <EnTeteModule icon="bars" title={t("Analyses de données")} tutoriel="analytics"
        titleMeta={tempsReel ? <LiveRefreshBadge intervalMs={30000} /> : undefined}
        secondaryActions={[{ content: t("Rapports"), href: "/dashboard/rapports" }, { content: t("Objectifs"), href: "/dashboard/objectifs" }]} />

      <BandeauPeriode period={libellePeriode} metrics={metrics}
        periods={avance ? PERIODES.map((p) => ({ id: p, label: t(LIBELLES_PERIODE[p]) })) : undefined} />

      {!avance ? (
        <UpgradeGate
          titre={t("Analytics avancés — Palier 1")}
          description={t("Historique complet, entonnoir de conversion, top produits et avis clients sont réservés aux paliers Pro et Illimité. Le Palier 0 affiche un résumé 7 jours.")}
          palierRequis="palier1"
        />
      ) : (
        <>
          {voitFinance && (
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <Card title={t("Ventes totales au fil du temps")}>
                <LineChart serie={points.map((p) => p.montant)} comparaison={pointsPrec} libelles={points.map((p) => p.date)} hauteur={240} area
                  devise={devise} ariaLabel={t("Ventes totales, {0} : {1}", libellePeriode, formatMontant(ind.chiffreAffaires, devise))}
                  legende={{ serie: libellePeriode, comparaison: t("Période précédente") }} />
              </Card>
              <Card title={t("Ventilation des ventes totales")}>
                <KeyValue items={lignesVentilation.map((l) => ({ label: t(l.label), value: formatMontant(l.valeur, devise), strong: l.strong }))} />
                <p className="mt-3 text-[12px] text-(--color-text-secondary)">{t("Commandes payées de la période, hors annulées.")}</p>
              </Card>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            {moyens.length > 0 && (
              <Card title={t("Ventes par moyen de paiement")}>
                <DonutChart segments={moyens} devise={devise} ariaLabel={t("Ventes par moyen de paiement")} />
              </Card>
            )}
            {visites > 0 && (
              <Card title={t("Entonnoir de conversion")}>
                <FunnelChart ariaLabel={t("Entonnoir de conversion")} etapes={[
                  { libelle: t("Visites"), valeur: Math.round(visites) },
                  { libelle: t("Vues produits"), valeur: Math.round(evt("product_view")) },
                  { libelle: t("Ajouts panier"), valeur: Math.round(evt("add_to_cart")) },
                  { libelle: t("Commandes en ligne"), valeur: enLigne },
                ]} />
              </Card>
            )}
            {echecs.length > 0 && (
              <Card title={t("Taux de refus à la livraison par ville")}>
                <HorizontalBar format="pourcent" lignes={echecs.map((e) => ({ libelle: t("{0} · {1} sur {2}", e.ville, e.echecs, e.total), valeur: e.pourcent }))} />
                <p className="mt-3 text-[12px] text-(--color-text-secondary)">{t("Livraisons payées à la livraison, terminées, non livrées.")}</p>
              </Card>
            )}
            {totalStatuts > 0 && (
              <Card title={t("Statuts des commandes")}>
                <HorizontalBar lignes={[...statuts].sort((a, b) => b._count - a._count).map((s) => ({ libelle: t(statutCommande(s.statut).label), valeur: s._count }))} />
                <p className="mt-3 text-[12px] text-(--color-text-secondary)">{t("{0} commandes depuis l'ouverture", totalStatuts.toLocaleString(t.loc))}</p>
              </Card>
            )}
          </div>

          {enCours && <VentesEnCours groupes={enCours} montant={montant} />}
          {voit("clients") && <DerniersClients clients={clients} montant={montant} />}
          {top && <TopProduitsVilles produits={top.produits} villes={top.villes} montant={montant} />}
          {voitFinance && <MonArgent disponible={argent?.disponible ?? 0} enAttente={argent?.enAttente ?? 0} prochaineLiberation={argent?.liberations[0]?.le ?? null} montant={montant} indisponible={!argent} />}

          {avis.length > 0 && (
            <Card title={t("Derniers avis clients")} padding="none">
              <ul>
                {avis.map((a) => (
                  <li key={a.id} className="border-t border-(--color-border-secondary) px-4 py-3 first:border-t-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate font-[550] text-(--color-text-strong)">{t(a.produit.nom)}</span>
                      <span className="whitespace-nowrap text-(--color-text-secondary)" aria-label={t("{0} sur 5", a.note)}>{"★".repeat(a.note)}{"☆".repeat(Math.max(0, 5 - a.note))}</span>
                    </div>
                    {a.commentaire && <p className="mt-0.5 line-clamp-2 text-[12px] text-(--color-text-secondary)">{t(a.commentaire)}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
