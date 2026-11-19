// Tableau de bord : résultats de la période et ce qui demande une action (PROMPT MISSION B7).
// Tout est calculé sur les données réelles (commande, client, analytics, produit, wallet).
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { AffiliationIncitationBanner } from "@/components/dashboard/AffiliationIncitationBanner";
import { AvisAxsoCarte } from "@/components/dashboard/AvisAxsoCarte";
import { BandeauCompletude } from "@/components/dashboard/BandeauCompletude";
import { BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";
import { AccueilTutorial } from "@/components/dashboard/tutorials/AccueilTutorial";
import {
  ATraiter, BarreEtat, DerniersClients, Indicateurs, MonArgent, SelecteurPeriode, TopProduitsVilles, VentesEnCours,
  type CarteIndicateur, type ClientRecent, type GroupeEnCours, type LigneATraiter,
} from "@/components/dashboard/tableau-de-bord/Sections";
import { eligibiliteAvis } from "@/lib/avis-plateforme";
import { accesComplet, permissionsSession } from "@/lib/permissions-server";
import { formatMontant } from "@/lib/utils";
import { getT } from "@/lib/i18n/serveur";
import { Bouton, EnTetePage } from "@/components/ui";
import { lienBoutique } from "@/lib/origine-site";
import { normaliserTelephone } from "@/lib/devise-convert";
import { soldeDisponible } from "@/lib/wallet";
import { PAIEMENT } from "@/lib/commandes";
import { chargerPeriode, compterATraiter } from "./donnees";
import { lignesATraiter } from "./a-traiter";
import { LIBELLES_PERIODE, bornesPeriode, courbe, indicateurs, lirePeriode, projectionMois, variation, type Intervalle } from "@/lib/tableau-de-bord";

const STATUTS_EN_COURS = ["confirmee", "en_preparation", "expediee"] as const;

export default async function TableauDeBordPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");
  const tenantId = (session.user as any)?.tenantId as string | undefined;
  if (!tenantId) redirect("/inscription");

  const periode = lirePeriode((await searchParams).periode);
  const b = bornesPeriode(periode);
  const perms = await permissionsSession(session);
  const voit = (m: keyof typeof perms) => perms[m] !== "aucun";
  // Membre sans droit finance (caissier…) : aucun montant ni argent, comme le menu Finance.
  const voitFinance = voit("finance");

  const dans = (i: Intervalle) => ({ gte: i.debut, lt: i.fin });
  const nonAnnulee = { tenantId, statut: { not: "annulee" } };

  const [
    tenant, { cmds, cmdsPrec, visites, visitesPrec }, compteurs,
    enCoursGroupes, enCoursListe, villes, lignesPayees, clientsRecents, programmeAffiliation, argent,
  ] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true, nomBoutique: true, statut: true, devise: true, pays: true } }),
    // ponytail: lignes de commande chargées pour la période ; passer en agrégats SQL si une boutique dépasse ~50 000 commandes/mois.
    chargerPeriode(tenantId, b),
    compterATraiter(tenantId),
    prisma.commande.groupBy({ by: ["statut"], where: { tenantId, statut: { in: [...STATUTS_EN_COURS] } }, _count: { _all: true }, _sum: { montantTotal: true } }),
    Promise.all(STATUTS_EN_COURS.map((statut) => prisma.commande.findMany({
      where: { tenantId, statut }, orderBy: { createdAt: "desc" }, take: 5,
      select: { id: true, numero: true, clientNom: true, montantTotal: true, paiementStatut: true, statut: true },
    }))),
    prisma.commande.groupBy({ by: ["ville"], where: { ...nonAnnulee, createdAt: dans(b) }, _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 5 }),
    prisma.ligneCommande.findMany({
      where: { commande: { tenantId, paiementStatut: PAIEMENT.PAYE, statut: { not: "annulee" }, createdAt: dans(b) } },
      select: { produitId: true, nom: true, prix: true, quantite: true, imageUrl: true },
    }),
    // 20 derniers clients = dernière commande la plus récente.
    prisma.commande.groupBy({ by: ["clientId"], where: { tenantId, clientId: { not: null } }, _max: { createdAt: true }, orderBy: { _max: { createdAt: "desc" } }, take: 20 }),
    prisma.programmeAffiliation.findUnique({ where: { tenantId }, select: { actif: true } }),
    voitFinance ? soldeDisponible(tenantId).catch(() => null) : Promise.resolve(null),
  ]);

  const devise = tenant?.devise || "XOF";
  const montant = (v: number) => (voitFinance ? formatMontant(v, devise) : "—");

  // ── Indicateurs ──
  const ind = indicateurs(cmds, visites);
  const prec = indicateurs(cmdsPrec, visitesPrec);
  const pct = (v: number | null) => (v === null ? "—" : `${v.toLocaleString(t.loc, { maximumFractionDigits: 1 })} %`);
  const cartes: CarteIndicateur[] = [
    { cle: "commandes", label: "Commandes", valeur: ind.commandes.toLocaleString(t.loc), evolution: variation(ind.commandes, prec.commandes) },
    ...(voitFinance ? [
      { cle: "ca", label: "Chiffre d'affaires", valeur: montant(ind.chiffreAffaires), evolution: variation(ind.chiffreAffaires, prec.chiffreAffaires),
        ...(periode === "mois" && ind.chiffreAffaires > 0 ? { aide: t("Projection fin de mois : {0}", montant(projectionMois(ind.chiffreAffaires))) } : {}) },
      { cle: "panier", label: "Panier moyen", valeur: ind.panierMoyen === null ? "—" : montant(ind.panierMoyen), evolution: variation(ind.panierMoyen, prec.panierMoyen) },
    ] : []),
    { cle: "visiteurs", label: "Visiteurs", valeur: Math.round(ind.visiteurs).toLocaleString(t.loc), evolution: variation(ind.visiteurs, prec.visiteurs) },
    { cle: "conversion", label: "Taux de conversion", valeur: pct(ind.conversion), evolution: variation(ind.conversion, prec.conversion),
      ...(ind.conversion === null ? { aide: "Aucun visiteur sur la période." } : {}) },
  ];

  // ── À traiter (chaque ligne seulement si le membre a accès à la liste) ──
  const aTraiter: LigneATraiter[] = lignesATraiter(compteurs, voit);

  // ── Ventes en cours : confirmées non livrées ; « payée » = paiementStatut completed (une commande
  // payée à la livraison ne l'est qu'une fois livrée : affichée « À encaisser »). ──
  const enCours: GroupeEnCours[] = STATUTS_EN_COURS.map((statut, i) => {
    const g = enCoursGroupes.find((x) => x.statut === statut);
    return {
      statut, nb: g?._count._all ?? 0, total: g?._sum.montantTotal ?? 0,
      commandes: enCoursListe[i].map((c) => ({ id: c.id, numero: c.numero, clientNom: c.clientNom, montantTotal: c.montantTotal, payee: c.paiementStatut === PAIEMENT.PAYE })),
    };
  });

  // ── Top produits ──
  const parProduit = new Map<string, { nom: string; qte: number; revenu: number; img: string | null }>();
  for (const l of lignesPayees) {
    const p = parProduit.get(l.produitId) ?? { nom: l.nom, qte: 0, revenu: 0, img: l.imageUrl ?? null };
    p.qte += l.quantite; p.revenu += l.prix * l.quantite;
    parProduit.set(l.produitId, p);
  }
  const topProduits = [...parProduit.values()].sort((a, b) => b.revenu - a.revenu).slice(0, 5);

  // ── Derniers clients ──
  const fiches = clientsRecents.length
    ? await prisma.client.findMany({
        where: { tenantId, id: { in: clientsRecents.map((c) => c.clientId!) } },
        select: { id: true, nom: true, ville: true, telephone: true, totalCommandes: true, totalDepense: true },
      })
    : [];
  const clients: ClientRecent[] = clientsRecents.flatMap((r) => {
    const c = fiches.find((f) => f.id === r.clientId);
    if (!c) return [];
    const tel = normaliserTelephone(c.telephone, tenant?.pays);
    return [{ id: c.id, nom: c.nom, ville: c.ville, totalCommandes: c.totalCommandes, totalDepense: c.totalDepense, derniere: r._max.createdAt!, whatsapp: tel ? tel.replace(/\D/g, "") : null }];
  });

  // Avis sur Axso : proposé au propriétaire une fois éligible (1re vente ou 14 jours), ou affiché s'il existe déjà.
  // Facultatif : une erreur ici ne doit jamais empêcher le tableau de bord de s'afficher.
  const avisAxso = (await accesComplet(session))
    ? await prisma.avisPlateforme.findUnique({ where: { tenantId }, select: { note: true, texte: true, auteurNom: true, auteurRole: true, ville: true, statut: true, motifRefus: true } }).catch(() => undefined)
    : undefined;
  const proposerAvis = avisAxso !== undefined && (avisAxso !== null || (await eligibiliteAvis(tenantId).catch(() => ({ eligible: false }))).eligible);

  const url = tenant?.slug ? await lienBoutique(tenant.slug) : null;
  const prenom = session.user?.name?.split(" ")[0] ?? "";
  const prochaine = argent?.liberations[0]?.le ?? null;

  return (
    <div className="space-y-4 sm:space-y-5">
      <AccueilTutorial />

      <EnTetePage className="mb-0"
        titre={t("Tableau de bord")}
        description={prenom ? t("Bonjour {0}, voici les résultats de {1}.", prenom, tenant?.nomBoutique ?? "") : undefined}
        indicateurs={<BoutonRevoirTutoriel moduleKey="accueil" />}
        actions={voit("produits") && (
          <Bouton variante="secondaire" href="/dashboard/produits/nouveau" icone={<Plus className="size-4" aria-hidden />}>{t("Ajouter un produit")}</Bouton>
        )}
      />

      {/* 1. État de la boutique + période */}
      {tenant && <BarreEtat statut={tenant.statut} url={url} nomBoutique={tenant.nomBoutique} />}
      <BandeauCompletude />
      <SelecteurPeriode periode={periode} />

      {/* 2. Indicateurs */}
      <Indicateurs cartes={cartes} periode={periode} />

      {/* 3. À traiter + 8. Mon argent (remonté à côté sur grand écran : c'est une action) */}
      <ATraiter lignes={aTraiter} />

      {/* 4. Ventes en cours */}
      {voit("commandes") && <VentesEnCours groupes={enCours} montant={montant} />}

      {/* 5. Courbe des ventes sur la période */}
      {voitFinance && <SalesChart donnees={courbe(cmds, b, t.loc)} devise={devise} libellePeriode={LIBELLES_PERIODE[periode]} />}

      {/* 6. Derniers clients */}
      {voit("clients") && <DerniersClients clients={clients} montant={montant} />}

      {/* 7. Top produits + villes */}
      {voit("commandes") && <TopProduitsVilles produits={topProduits} villes={villes.map((v) => ({ ville: v.ville, nb: v._count.id }))} montant={montant} />}

      {/* 8. Mon argent */}
      {voitFinance && argent && (
        <MonArgent disponible={argent.disponible} enAttente={argent.enAttente} prochaineLiberation={prochaine} montant={montant} />
      )}
      {voitFinance && !argent && (
        <MonArgent disponible={0} enAttente={0} prochaineLiberation={null} montant={montant} indisponible />
      )}

      {!programmeAffiliation?.actif && <AffiliationIncitationBanner />}
      {proposerAvis && <AvisAxsoCarte avis={avisAxso ?? null} nomParDefaut={session.user?.name ?? ""} />}
    </div>
  );
}
