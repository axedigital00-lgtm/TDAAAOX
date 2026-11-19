// Accueil (masterprompt §8.1, D7) : indicateurs, salutation, champ AXIA, chips « À traiter », fil des étapes B4.
// Tout est calculé sur les données réelles (lib/demarrage.ts, accueil/donnees.ts) ; l'URL reste /dashboard/demarrer (D23).
// Le détail des ventes (en cours, clients, top produits, Mon argent) reste sur le Tableau de bord (/dashboard/accueil).
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/serveur";
import { exigerModule, permissionsSession } from "@/lib/permissions-server";
import type { ModuleKey } from "@/lib/permissions";
import { chargerDemarrage } from "@/lib/demarrage";
import { badgeCompleteVisible, prochaineEtape, type CleEtape, type Etape } from "@/lib/demarrage-regles";
import { TITRES_ETAPES, listeFr, phraseEtape } from "@/lib/demarrage-messages";
import { lienBoutique, origineAxso, origineSite } from "@/lib/origine-site";
import { formatMontant } from "@/lib/utils";
import { LIBELLES_PERIODE, PERIODES, bornesPeriode, courbe, indicateurs, lirePeriode, variation } from "@/lib/tableau-de-bord";
import { BoutonPublier } from "@/components/dashboard/BoutonPublier";
import { BadgeComplete } from "@/components/dashboard/BandeauCompletudeVue";
import { PartageAffilies } from "@/components/dashboard/PartageAffilies";
import { Banner, Button } from "@/components/ui/adm";
import { Sparkline } from "@/components/ui/graphiques";
import { VignetteApplications, VignetteCartons, VignetteConversion, VignetteDomaine, VignetteLivraison } from "@/components/ui/illustrations";
import { Icon } from "@/components/ui/icones";
import { chargerPeriode, compterATraiter } from "../accueil/donnees";
import { lignesATraiter } from "../accueil/a-traiter";
import { ChampAxia } from "./ChampAxia";
import { CarteFil } from "./CarteFil";

export const metadata = { title: "Accueil" };

/** Module à pouvoir modifier pour faire l'étape (même règle que le menu). */
const MODULE: Record<CleEtape, ModuleKey> = {
  produit: "produits", constructeur: "boutique", livraison: "parametres", politiques: "boutique",
  coordonnees: "parametres", affilies: "marketing", domaine: "parametres",
};
const ETATS: Record<Etape["etat"], string> = { a_faire: "À faire", axia: "Préparé par Axia — à vérifier", termine: "Terminé" };
const BOUTONS: Record<CleEtape, string> = {
  produit: "Ajouter un produit", constructeur: "Ouvrir le constructeur", livraison: "Configurer la livraison",
  politiques: "Rédiger mes politiques", coordonnees: "Compléter mes coordonnées", affilies: "Gérer l'affiliation", domaine: "Brancher un domaine",
};

export default async function AccueilPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");
  const tenantId = (session.user as any)?.tenantId as string | undefined;
  if (!tenantId) redirect("/inscription");
  await exigerModule(session, "boutique");

  const periode = lirePeriode((await searchParams).periode);
  const b = bornesPeriode(periode);
  const [demarrage, tenant, programme, perms, donneesPeriode, compteurs] = await Promise.all([
    chargerDemarrage(tenantId),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true, nomBoutique: true, devise: true } }),
    prisma.programmeAffiliation.findUnique({ where: { tenantId }, select: { id: true } }),
    permissionsSession(session),
    chargerPeriode(tenantId, b),
    compterATraiter(tenantId),
  ]);
  if (!demarrage || !tenant) redirect("/dashboard/accueil");

  const { donnees, etapes, progression: prog, completude } = demarrage;
  const publiee = donnees.statut !== "brouillon";
  const url = publiee ? await lienBoutique(tenant.slug) : `${await origineSite()}/${tenant.slug}`;
  const lienAffilies = programme ? `${await origineAxso()}/rejoindre/${programme.id}` : null;
  const prochaine = prochaineEtape(etapes);
  const prenom = session.user?.name?.split(" ")[0] ?? "";
  const voit = (m: ModuleKey) => perms[m] !== "aucun";
  const peut = (cle: CleEtape) => perms[MODULE[cle]] === "ecriture";
  const peutPublier = !publiee && perms.boutique === "ecriture";

  // ── Indicateurs (mêmes définitions que le Tableau de bord) ──
  const { cmds, cmdsPrec, visites, visitesPrec } = donneesPeriode;
  const ind = indicateurs(cmds, visites);
  const prec = indicateurs(cmdsPrec, visitesPrec);
  const points = courbe(cmds, b, t.loc);
  const pct = (v: number | null) => (v === null ? "—" : `${v.toLocaleString(t.loc, { maximumFractionDigits: 1 })} %`);
  const kpis = [
    { cle: "visites", label: "Visites", valeur: Math.round(ind.visiteurs).toLocaleString(t.loc), delta: variation(ind.visiteurs, prec.visiteurs) },
    ...(voit("finance") ? [{ cle: "ventes", label: "Ventes totales", valeur: formatMontant(ind.chiffreAffaires, tenant.devise || "XOF"), delta: variation(ind.chiffreAffaires, prec.chiffreAffaires), serie: points.map((p) => p.montant) }] : []),
    { cle: "commandes", label: "Commandes", valeur: ind.commandes.toLocaleString(t.loc), delta: variation(ind.commandes, prec.commandes), serie: points.map((p) => p.commandes) },
    { cle: "conversion", label: "Taux de conversion", valeur: pct(ind.conversion), delta: variation(ind.conversion, prec.conversion) },
  ];

  // ── Chips : seulement les compteurs non nuls que le membre peut voir ──
  const chips = lignesATraiter(compteurs, voit).filter((l) => l.nombre > 0);

  // ── Fil : étapes à faire dans l'ordre, puis recommandations (masquables) ──
  const vignette = (cle: CleEtape) => {
    switch (cle) {
      case "domaine": return <VignetteDomaine domaine={url.replace(/^https?:\/\//, "")} />;
      case "livraison": return <VignetteLivraison />;
      case "constructeur": return <VignetteConversion />;
      case "produit": return <VignetteCartons />;
      default: return <VignetteApplications />;
    }
  };
  const aFaire = etapes.filter((e) => e.etat !== "termine");
  const faites = etapes.filter((e) => e.etat === "termine");

  function Etape({ e }: { e: Etape }) {
    const { texte, liste } = phraseEtape(e, donnees);
    const enAvant = prochaine?.cle === e.cle;
    const versAffiliation = e.cle === "affilies" && !lienAffilies;
    return (
      <CarteFil vignette={vignette(e.cle)} pastille={t(ETATS[e.etat])} titre={t(TITRES_ETAPES[e.cle])}
        texte={<>
          <p>{t(texte, listeFr((liste ?? []).map((x) => t(x))))}</p>
          {e.niveau === "publier" && e.etat !== "termine" && <p className="mt-1 font-[550] text-(--color-critical-text)">{t("Requis pour publier")}</p>}
          {e.etat !== "termine" && e.cle === "affilies" && lienAffilies && peut(e.cle) && <PartageAffilies lien={lienAffilies} nomBoutique={tenant!.nomBoutique} />}
        </>}
        action={peut(e.cle) && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={enAvant && e.etat !== "termine" ? "primary" : "default"} href={versAffiliation ? "/dashboard/affiliation" : e.href}>
              {e.etat === "termine" ? t("Voir") : t(versAffiliation ? "Activer l'affiliation" : BOUTONS[e.cle])}
            </Button>
            {e.cle === "produit" && e.etat !== "termine" && donnees.nbExemples > 0 && (
              <Button size="sm" variant="tint" icon="sparkle" href="/dashboard/produits?filtre=inactif">{t("Activer un exemple d'Axia")}</Button>
            )}
          </div>
        )} />
    );
  }

  return (
    <div className="mx-auto max-w-[1000px] pb-[120px]">
      {/* 1. Barre d'indicateurs */}
      <div className="flex items-center gap-9 overflow-x-auto whitespace-nowrap px-1 pt-3.5 text-(--color-text-secondary)">
        <details className="relative flex-1 text-left">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-(--radius-md) px-1.5 py-1 font-[550] text-(--color-text-strong) hover:bg-(--color-surface-tertiary)">
            {t(LIBELLES_PERIODE[periode])}<Icon name="chevronDown" />
          </summary>
          <div className="absolute left-0 z-10 mt-1 min-w-40 rounded-(--radius-lg) bg-(--color-surface) p-1 shadow-(--shadow-popover)">
            {PERIODES.map((p) => (
              <Link key={p} href={`/dashboard/demarrer?periode=${p}`} aria-current={p === periode ? "true" : undefined}
                className="flex h-8 items-center rounded-(--radius-md) px-2 text-(--color-text) hover:bg-(--color-surface-secondary) aria-[current]:font-[600]">
                {t(LIBELLES_PERIODE[p])}
              </Link>
            ))}
          </div>
        </details>
        {kpis.map((k) => (
          <div key={k.cle} className="text-center max-[820px]:hidden">
            <div>{t(k.label)}</div>
            <div className="flex items-center justify-center gap-1.5 font-[600] text-(--color-text-strong) tabular">
              {k.valeur}
              {k.delta !== null && (
                <span className={`text-[12px] font-[550] ${k.delta >= 0 ? "text-(--badge-success-text)" : "text-(--color-text-secondary)"}`}>
                  {k.delta >= 0 ? "↗" : "↘"} {Math.abs(k.delta).toLocaleString(t.loc)} %
                </span>
              )}
              {k.serie && <Sparkline data={k.serie} width={40} height={16} />}
            </div>
          </div>
        ))}
        <div className="flex-1 text-right">
          <Link href="/dashboard/accueil" className="text-(--color-link) hover:underline">{t("Voir le tableau de bord")}</Link>
        </div>
      </div>

      {/* 2. Salutation */}
      <h1 className="mx-auto mt-14 mb-7 text-center text-[28px] font-[550] leading-9 tracking-[-.4px] text-(--color-text-strong) max-[820px]:mt-7 max-[820px]:mb-5 max-[820px]:text-[22px] max-[820px]:leading-[29px]">
        {prenom ? t("Bonjour {0} !", prenom) : t("Bonjour !")}<br />{t("Continuons à développer votre entreprise.")}
      </h1>

      {/* 3. Champ AXIA */}
      <ChampAxia />

      {/* 4. Chips « À traiter » */}
      <div className={`flex flex-wrap justify-center gap-2 mt-4 ${chips.length ? "mb-14" : "mb-10"}`}>
        {chips.map((c) => (
          <Link key={c.cle} href={c.href}
            className="inline-flex h-[34px] items-center gap-2 rounded-(--radius-xl) bg-(--color-surface) pl-3 pr-1.5 font-[500] text-(--color-text-strong) shadow-[0_0_0_1px_var(--color-border)] hover:bg-(--color-surface-secondary)">
            {t(c.chip)}
            <b className="rounded-(--radius-md) bg-(--color-surface-tertiary) px-1.5 text-[12px] font-[550] leading-[22px] text-(--color-text-secondary)">{c.nombre.toLocaleString(t.loc)}</b>
          </Link>
        ))}
      </div>

      {/* Boutique : publication et complétude (D7) */}
      <div className="mx-auto mb-4 max-w-[940px] space-y-3">
        {!publiee && (
          <Banner tone="warning" title={t("Votre boutique n'est pas encore publiée")}>
            <p>{t("Elle n'est visible que par votre équipe. Un vrai produit actif suffit pour publier ; le reste peut se faire ensuite.")}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {peutPublier && <BoutonPublier variante="compact" />}
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-(--color-link)">{t("Voir ma boutique")}</a>
            </div>
          </Banner>
        )}
        {badgeCompleteVisible(donnees.suivi, completude.pourcent, new Date()) && <BadgeComplete />}
        {aFaire.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--color-surface-tertiary)" role="progressbar" aria-label={t("Progression du démarrage")}
              aria-valuenow={prog.faites} aria-valuemin={0} aria-valuemax={prog.total}>
              <div className="h-full rounded-full bg-(--color-primary)" style={{ width: `${Math.round((prog.faites / prog.total) * 100)}%` }} />
            </div>
            <span className="shrink-0 text-[12px] font-[550] text-(--color-text-secondary)">{t("{0} étapes sur {1}", prog.faites, prog.total)}</span>
          </div>
        )}
      </div>

      {/* 5. Fil */}
      <div className="mx-auto grid max-w-[940px] grid-cols-3 gap-4 max-[1100px]:grid-cols-2 max-[820px]:grid-cols-1">
        {aFaire.map((e) => <Etape key={e.cle} e={e} />)}
      </div>

      {/* Paiements : information, pas une étape (D3) */}
      <p className="mx-auto mt-6 flex max-w-[940px] items-start gap-2 text-(--color-text-secondary)">
        <Icon name="info" className="mt-0.5" />{t("Paiement à la livraison actif. Orange Money et MTN Mobile Money : bientôt disponibles.")}
      </p>

      {/* Étapes terminées, repliées */}
      {faites.length > 0 && (
        <details className="mx-auto mt-6 max-w-[940px]">
          <summary className="cursor-pointer list-none font-[550] text-(--badge-success-text)">{t("Étapes terminées ({0})", faites.length)}</summary>
          <div className="mt-3 grid grid-cols-3 gap-4 max-[1100px]:grid-cols-2 max-[820px]:grid-cols-1">
            {faites.map((e) => <Etape key={e.cle} e={e} />)}
          </div>
        </details>
      )}
    </div>
  );
}
