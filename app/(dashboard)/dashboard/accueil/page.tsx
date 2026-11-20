// Accueil (MASTERPROMPT §8.1), sans en-tête de page : barre de KPI sur 30 jours,
// salutation, champ Stella, actions à traiter et fil de recommandations.
// Les analyses détaillées vivent dans Analyses de données.
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMontant } from "@/lib/utils";
import { accesComplet, permissionsSession } from "@/lib/permissions-server";
import { eligibiliteAvis } from "@/lib/avis-plateforme";
import { AvisAxsoCarte } from "@/components/dashboard/AvisAxsoCarte";
import { AccueilTutorial } from "@/components/dashboard/tutorials/AccueilTutorial";
import { Page } from "@/components/dashboard/design-system/components/PageHeader";
import { Delta } from "@/components/dashboard/design-system/components/MetricsStrip";
import { MiniLineChart } from "@/components/dashboard/design-system/components/Charts";
import { FeedArt } from "@/components/dashboard/design-system/illustrations/Illustration";
import { HomeAsk, HomeFeed, type FeedItem } from "@/components/dashboard/features/home/HomeClient";
import { nombre, pourcentage, variation, debutJour, serie } from "@/components/dashboard/design-system/format";

const JOUR = 86_400_000;

export default async function AccueilPage() {
  const session = await auth();
  if (!session) redirect("/connexion");
  const tenantId = (session.user as any)?.tenantId as string | undefined;
  if (!tenantId) redirect("/inscription");

  const droits = await permissionsSession(session);
  const voitFinance = droits.finance !== "aucun";
  const maintenant = new Date();
  const debut30 = debutJour(maintenant, -29);
  const debut60 = debutJour(maintenant, -59);
  const debut7 = debutJour(maintenant, -6);
  const debut14 = debutJour(maintenant, -13);

  const [tenant, cmd60, visites60, aTraiter, aEncaisser, live, totalCommandes, programmeAffiliation, lignes14] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { devise: true, nomBoutique: true, slug: true, customDomain: true, domaineActifAt: true } }),
    prisma.commande.findMany({ where: { tenantId, createdAt: { gte: debut60 }, statut: { not: "annulee" } }, select: { createdAt: true, montantTotal: true, paiementStatut: true } }),
    prisma.analytics.findMany({ where: { tenantId, type: "page_view", date: { gte: debut60 } }, select: { date: true, valeur: true } }),
    prisma.commande.count({ where: { tenantId, statut: { in: ["en_attente", "confirmee"] } } }),
    prisma.commande.count({ where: { tenantId, paiementStatut: "pending", methodePaiement: { notIn: ["notchpay", "en_attente"] }, statut: { notIn: ["annulee", "en_attente"] } } }),
    prisma.pixelEvent.groupBy({ by: ["sessionId"], where: { tenantId, type: "PageView", sessionId: { not: null }, createdAt: { gt: new Date(maintenant.getTime() - 5 * 60_000), lte: maintenant } } }).then(sessions => sessions.length),
    prisma.commande.count({ where: { tenantId, statut: { not: "annulee" } } }),
    prisma.programmeAffiliation.findUnique({ where: { tenantId }, select: { actif: true } }).catch(() => null),
    prisma.ligneCommande.findMany({
      where: { commande: { tenantId, createdAt: { gte: debut14 }, statut: { not: "annulee" } } },
      select: { nom: true, prix: true, quantite: true, commande: { select: { createdAt: true } } },
    }),
  ]);
  const devise = tenant?.devise || "XAF";

  // ── Barre de KPI : 30 derniers jours vs 30 jours précédents ──
  const cmd30 = cmd60.filter((c) => c.createdAt >= debut30), cmdPrec = cmd60.filter((c) => c.createdAt < debut30);
  const vis30 = visites60.filter((v) => v.date >= debut30), visPrec = visites60.filter((v) => v.date < debut30);
  const somme = (l: { valeur: number }[]) => l.reduce((t, v) => t + v.valeur, 0);
  const ventes = (l: typeof cmd60) => l.filter((c) => c.paiementStatut === "completed").reduce((t, c) => t + c.montantTotal, 0);
  const nbVisites = somme(vis30), nbVisitesPrec = somme(visPrec);
  const conversion = nbVisites ? (cmd30.length / nbVisites) * 100 : null;
  const conversionPrec = nbVisitesPrec ? (cmdPrec.length / nbVisitesPrec) * 100 : null;
  const compactMontant = (n: number) => devise === "XAF" || devise === "XOF"
    ? (n >= 1e6 ? `${nombre(n / 1e6, 2)} M FCFA` : n >= 1e4 ? `${nombre(n / 1e3, 1)} k FCFA` : `${nombre(n)} FCFA`)
    : formatMontant(n, devise);

  // ── Insights de la semaine (7 derniers jours vs 7 précédents) ──
  const parJour = (debut: Date, ev: { date: Date; valeur?: number }[]) => serie(ev, debut, JOUR, 7);
  const visSemaine = parJour(debut7, visites60.filter((v) => v.date >= debut7).map((v) => ({ date: v.date, valeur: v.valeur })));
  const visSemainePrec = parJour(debut14, visites60.filter((v) => v.date >= debut14 && v.date < debut7).map((v) => ({ date: v.date, valeur: v.valeur })));
  const tVis = visSemaine.reduce((a, b) => a + b, 0), tVisPrec = visSemainePrec.reduce((a, b) => a + b, 0);
  const ventesProduit = new Map<string, { semaine: number; prec: number; s: number[]; p: number[] }>();
  for (const l of lignes14) {
    const e = ventesProduit.get(l.nom) ?? { semaine: 0, prec: 0, s: new Array(7).fill(0), p: new Array(7).fill(0) };
    const montant = l.prix * l.quantite;
    const t = l.commande.createdAt;
    if (t >= debut7) { e.semaine += montant; e.s[Math.min(6, Math.floor((t.getTime() - debut7.getTime()) / JOUR))] += montant; }
    else { e.prec += montant; e.p[Math.min(6, Math.floor((t.getTime() - debut14.getTime()) / JOUR))] += montant; }
    ventesProduit.set(l.nom, e);
  }
  const meilleur = [...ventesProduit.entries()].filter(([, e]) => e.prec > 0 && e.semaine > e.prec)
    .sort((a, b) => (b[1].semaine / b[1].prec) - (a[1].semaine / a[1].prec))[0];

  const domaine = tenant?.slug ? `${tenant.slug}.cm` : undefined;
  const feed: FeedItem[] = [];
  if (droits.boutique !== "aucun") feed.push({
    id: "conversion", art: <img src="/editorial/conversion.webp" className="axd-feed-photo" alt="" loading="lazy" />, task: { done: 0, total: 3 },
    title: "Améliorez votre taux de conversion",
    text: "Augmentez la part de visiteurs qui achètent sur votre boutique : fiches produits complètes, photos nettes et commande en quelques étapes.",
    action: { label: "Démarrer", href: "/dashboard/builder" },
  });
  if (!tenant?.domaineActifAt && droits.boutique !== "aucun") feed.push({
    id: "domaine", art: <FeedArt name="domain" domaine={domaine} />,
    title: `Obtenez un domaine correspondant à ${tenant?.nomBoutique ?? "votre boutique"}`,
    text: "Une adresse à votre nom inspire confiance et se retient facilement. Connectez un domaine existant ou choisissez-en un nouveau.",
    action: { label: "Choisir un domaine", href: "/dashboard/parametres/domaine" },
  });
  if (droits.commandes !== "aucun") feed.push({
    id: "livraison", art: <img src="/editorial/livraison.webp" className="axd-feed-photo" alt="" loading="lazy" />,
    title: "Vérifier les tarifs de livraison",
    text: "Passez en revue vos zones et vos tarifs pour Douala, Yaoundé et les villes secondaires avant vos prochaines commandes.",
    action: { label: "Vérifier les tarifs", href: "/dashboard/livraison" },
  });
  if (tVisPrec > 0 && tVis !== tVisPrec && droits.produits !== "aucun") {
    const v = Math.round(Math.abs((tVis - tVisPrec) / tVisPrec) * 100);
    feed.push({
      id: `visites-${jourCle(debut7)}`, art: <div className="axd-fc__chart"><MiniLineChart data={visSemaine} compare={visSemainePrec} /></div>,
      title: tVis > tVisPrec ? `Les visites de votre boutique ont augmenté de ${v} %` : `Les visites de votre boutique ont baissé de ${v} %`,
      text: `Il s’agit d’une ${tVis > tVisPrec ? "hausse" : "baisse"} de ${v} %, passant de ${nombre(tVisPrec)} à ${nombre(tVis)} visites par rapport à la semaine dernière.`,
      action: { label: "Afficher le rapport", href: "/dashboard/analytics" },
    });
  }
  if (meilleur && voitFinance) {
    const [nom, e] = meilleur;
    const v = Math.round(((e.semaine - e.prec) / e.prec) * 100);
    feed.push({
      id: `produit-${jourCle(debut7)}`, art: <div className="axd-fc__chart"><MiniLineChart data={e.s} compare={e.p} /></div>,
      title: `${nom} : ventes en hausse de ${v} %`,
      text: `Les ventes de ce produit ont progressé de ${v} %, passant de ${formatMontant(e.prec, devise)} à ${formatMontant(e.semaine, devise)} par rapport à la semaine dernière.`,
      action: { label: "Afficher le rapport", href: "/dashboard/rapports" },
    });
  }
  if (droits.clients !== "aucun") feed.push({
    id: "whatsapp", art: <img src="/editorial/catalogue-chat.webp" className="axd-feed-photo" alt="" loading="lazy" />,
    title: "Vendez directement sur WhatsApp",
    text: "Recevez les commandes de vos clients WhatsApp directement dans AXSO, prêtes à être confirmées et livrées.",
    action: { label: "Connecter WhatsApp", href: "/dashboard/whatsapp" },
  });
  if (!programmeAffiliation?.actif && droits.marketing !== "aucun") feed.push({
    id: "affiliation", art: <img src="/editorial/affiliation.webp" className="axd-feed-photo" alt="" loading="lazy" />,
    title: "Faites vendre vos produits par des affiliés",
    text: "Des créateurs et revendeurs partagent vos produits et touchent une commission sur chaque vente.",
    action: { label: "Lancer le programme", href: "/dashboard/affiliation" },
  });
  if (totalCommandes < 100) feed.push({
    id: "100-ventes", art: <img src="/editorial/ventes.webp" className="axd-feed-photo" alt="" loading="lazy" />, task: { done: Math.min(totalCommandes, 100), total: 100 },
    title: "Réalisez vos 100 premières ventes",
    text: `Vous en êtes à ${nombre(totalCommandes)} commande${totalCommandes > 1 ? "s" : ""}. Partagez votre boutique, lancez une promotion et relancez vos clients pour y arriver.`,
    action: { label: "Démarrer", href: "/dashboard/marketing" },
  });

  // Avis sur AXSO : proposé au propriétaire une fois éligible. Facultatif : ne bloque jamais l'accueil.
  const avisAxso = (await accesComplet(session))
    ? await prisma.avisPlateforme.findUnique({ where: { tenantId }, select: { note: true, texte: true, auteurNom: true, auteurRole: true, ville: true, statut: true, motifRefus: true } }).catch(() => undefined)
    : undefined;
  const proposerAvis = avisAxso !== undefined && (avisAxso !== null || (await eligibiliteAvis(tenantId).catch(() => ({ eligible: false }))).eligible);

  const prenom = session.user?.name?.split(" ")[0];
  return (
    <Page width="narrow">
      <AccueilTutorial />
      <div className="axd-kbar">
        <div className="axd-kbar__side"><span style={{ fontWeight: 550, color: "var(--color-text-strong)" }}>30 derniers jours</span> · Tous les canaux</div>
        <Link href="/dashboard/analytics" className="axd-kbar__k">
          <div>Visites</div>
          <div className="axd-kbar__v">{nombre(nbVisites)} <Delta value={variation(nbVisites, nbVisitesPrec)} /></div>
        </Link>
        {voitFinance && (
          <Link href="/dashboard/analytics" className="axd-kbar__k">
            <div>Ventes totales</div>
            <div className="axd-kbar__v">{compactMontant(ventes(cmd30))} <Delta value={variation(ventes(cmd30), ventes(cmdPrec))} /></div>
          </Link>
        )}
        <Link href="/dashboard/commandes" className="axd-kbar__k">
          <div>Commandes</div>
          <div className="axd-kbar__v">{nombre(cmd30.length)} <Delta value={variation(cmd30.length, cmdPrec.length)} /></div>
        </Link>
        <Link href="/dashboard/analytics" className="axd-kbar__k">
          <div>Taux de conversion</div>
          <div className="axd-kbar__v">{conversion === null ? "—" : pourcentage(conversion, 1)} <Delta value={conversion !== null && conversionPrec ? variation(conversion, conversionPrec) : null} /></div>
        </Link>
        <div className="axd-kbar__side axd-kbar__side--end">
          <Link href="/dashboard/analytics/live">Visiteurs en direct <b style={{ color: "var(--color-text-strong)" }}>{nombre(live)}</b><span className="axd-live" /></Link>
        </div>
      </div>

      <div className="axd-hero">
        <h1>Bonjour{prenom ? ` ${prenom}` : ""} !<br />Continuons à développer votre entreprise.</h1>
      </div>

      <HomeAsk />

      <div className="axd-chips">
        {droits.commandes !== "aucun" && aTraiter > 0 && (
          <Link href="/dashboard/commandes?view=non_traitees" className="axd-chip">Traiter les commandes <b>{aTraiter > 50 ? "50+" : aTraiter}</b></Link>
        )}
        {droits.commandes !== "aucun" && aEncaisser > 0 && (
          <Link href="/dashboard/commandes?view=non_payees" className="axd-chip">Confirmer les paiements à la livraison <b>{aEncaisser > 50 ? "50+" : aEncaisser}</b></Link>
        )}
      </div>

      <HomeFeed items={feed} />

      {proposerAvis && <div style={{ maxWidth: 940, margin: "var(--space-600) auto 0" }}><AvisAxsoCarte avis={avisAxso ?? null} nomParDefaut={session.user?.name ?? ""} /></div>}
    </Page>
  );
}

function jourCle(d: Date) { return d.toISOString().slice(0, 10); }
