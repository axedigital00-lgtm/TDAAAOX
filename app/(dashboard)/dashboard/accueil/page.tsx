// Tableau de bord : résultats de la période et ce qui demande une action (PROMPT MISSION B7).
// Tout est calculé sur les données réelles (commande, client, analytics, produit, wallet).
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AffiliationIncitationBanner } from "@/components/dashboard/AffiliationIncitationBanner";
import { AvisAxsoCarte } from "@/components/dashboard/AvisAxsoCarte";
import { BandeauCompletude } from "@/components/dashboard/BandeauCompletude";
import { BoutonRevoirTutoriel } from "@/components/dashboard/ModuleTutorial";
import { AccueilTutorial } from "@/components/dashboard/tutorials/AccueilTutorial";
import {
  ATraiter, BarreEtat, DerniersClients, Indicateurs, MonArgent, SelecteurPeriode, TopProduitsVilles, VentesEnCours,
  type CarteIndicateur, type LigneATraiter,
} from "@/components/dashboard/tableau-de-bord/Sections";
import { eligibiliteAvis } from "@/lib/avis-plateforme";
import { accesComplet, permissionsSession } from "@/lib/permissions-server";
import { formatMontant } from "@/lib/utils";
import { getT } from "@/lib/i18n/serveur";
import { Card, PageHeader } from "@/components/ui/adm";
import { LineChart } from "@/components/ui/graphiques";
import { lienBoutique } from "@/lib/origine-site";
import { soldeDisponible } from "@/lib/wallet";
import { chargerDerniersClients, chargerPeriode, chargerTopProduitsVilles, chargerVentesEnCours, compterATraiter } from "./donnees";
import { lignesATraiter } from "./a-traiter";
import { LIBELLES_PERIODE, bornesPeriode, courbe, indicateurs, lirePeriode, projectionMois, variation } from "@/lib/tableau-de-bord";

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

  const [tenant, { cmds, cmdsPrec, visites, visitesPrec }, compteurs, enCours, { produits: topProduits, villes }, programmeAffiliation, argent] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true, nomBoutique: true, statut: true, devise: true, pays: true } }),
    chargerPeriode(tenantId, b),
    compterATraiter(tenantId),
    chargerVentesEnCours(tenantId),
    chargerTopProduitsVilles(tenantId, b),
    prisma.programmeAffiliation.findUnique({ where: { tenantId }, select: { actif: true } }),
    voitFinance ? soldeDisponible(tenantId).catch(() => null) : Promise.resolve(null),
  ]);
  const clients = await chargerDerniersClients(tenantId, tenant?.pays);

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

  // Avis sur Axso : proposé au propriétaire une fois éligible (1re vente ou 14 jours), ou affiché s'il existe déjà.
  // Facultatif : une erreur ici ne doit jamais empêcher le tableau de bord de s'afficher.
  const avisAxso = (await accesComplet(session))
    ? await prisma.avisPlateforme.findUnique({ where: { tenantId }, select: { note: true, texte: true, auteurNom: true, auteurRole: true, ville: true, statut: true, motifRefus: true } }).catch(() => undefined)
    : undefined;
  const proposerAvis = avisAxso !== undefined && (avisAxso !== null || (await eligibiliteAvis(tenantId).catch(() => ({ eligible: false }))).eligible);

  const url = tenant?.slug ? await lienBoutique(tenant.slug) : null;
  const prenom = session.user?.name?.split(" ")[0] ?? "";
  const prochaine = argent?.liberations[0]?.le ?? null;

  const points = voitFinance ? courbe(cmds, b, t.loc) : [];
  return (
    <div className="space-y-4 sm:space-y-5">
      <AccueilTutorial />

      <div>
        <PageHeader icon="gauge" title={t("Tableau de bord")} titleMeta={<BoutonRevoirTutoriel moduleKey="accueil" />}
          primaryAction={voit("produits") ? { content: t("Ajouter un produit"), href: "/dashboard/produits/nouveau", icon: "plus" } : undefined} />
        {prenom && <p className="-mt-1 text-(--color-text-secondary)">{t("Bonjour {0}, voici les résultats de {1}.", prenom, tenant?.nomBoutique ?? "")}</p>}
      </div>

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
      {voitFinance && points.length > 0 && (
        <Card title={t("Ventes totales au fil du temps")}>
          <LineChart serie={points.map((p) => p.montant)} libelles={points.map((p) => p.date)} hauteur={220} area devise={devise}
            ariaLabel={t("Ventes totales, {0} : {1}", t(LIBELLES_PERIODE[periode]), formatMontant(points.reduce((s, p) => s + p.montant, 0), devise))}
            legende={{ serie: t(LIBELLES_PERIODE[periode]) }} />
        </Card>
      )}

      {/* 6. Derniers clients */}
      {voit("clients") && <DerniersClients clients={clients} montant={montant} />}

      {/* 7. Top produits + villes */}
      {voit("commandes") && <TopProduitsVilles produits={topProduits} villes={villes} montant={montant} />}

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
