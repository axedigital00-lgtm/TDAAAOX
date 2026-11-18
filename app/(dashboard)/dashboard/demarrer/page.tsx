// Accueil, ex-« Démarrer » (PROMPT MISSION B4) : ce qui reste à faire pour vendre, chaque carte menant au bon endroit.
// États calculés sur les données réelles (lib/demarrage.ts) ; le Tableau de bord reste /dashboard/accueil.
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, BadgeCheck, Contact, FileText, Globe, Info, Package, Paintbrush, Sparkles, Truck, Users,
  type LucideIcon,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/i18n/serveur";
import { exigerModule, permissionsSession } from "@/lib/permissions-server";
import type { ModuleKey } from "@/lib/permissions";
import { chargerDemarrage } from "@/lib/demarrage";
import { badgeCompleteVisible, prochaineEtape, type CleEtape, type Etape } from "@/lib/demarrage-regles";
import { PROMPTS_AXIA, TITRES_ETAPES, listeFr, phraseEtape } from "@/lib/demarrage-messages";
import { lienBoutique, origineAxso, origineSite } from "@/lib/origine-site";
import { BoutonPublier } from "@/components/dashboard/BoutonPublier";
import { BadgeComplete } from "@/components/dashboard/BandeauCompletudeVue";
import { PartageAffilies } from "@/components/dashboard/PartageAffilies";
import { Alerte, Badge, classesBouton, type Ton } from "@/components/ui";

// Entrée « Accueil » du menu (l'URL reste /dashboard/demarrer).
export const metadata = { title: "Accueil" };

const ICONES: Record<CleEtape, LucideIcon> = {
  produit: Package, constructeur: Paintbrush, livraison: Truck, politiques: FileText,
  coordonnees: Contact, affilies: Users, domaine: Globe,
};
/** Module à pouvoir modifier pour faire l'étape (même règle que le menu). */
const MODULE: Record<CleEtape, ModuleKey> = {
  produit: "produits", constructeur: "boutique", livraison: "parametres", politiques: "boutique",
  coordonnees: "parametres", affilies: "marketing", domaine: "parametres",
};
const ETATS: Record<Etape["etat"], { label: string; ton: Ton }> = {
  a_faire: { label: "À faire", ton: "neutre" },
  axia: { label: "Préparé par Axia — à vérifier", ton: "info" },
  termine: { label: "Terminé", ton: "succes" },
};
const BOUTONS: Record<CleEtape, string> = {
  produit: "Ajouter un produit", constructeur: "Ouvrir le constructeur", livraison: "Configurer la livraison",
  politiques: "Rédiger mes politiques", coordonnees: "Compléter mes coordonnées", affilies: "Gérer l'affiliation", domaine: "Brancher un domaine",
};

export default async function DemarrerPage() {
  const t = await getT();
  const session = await auth();
  if (!session) redirect("/connexion");
  const tenantId = (session.user as any)?.tenantId as string | undefined;
  if (!tenantId) redirect("/inscription");
  await exigerModule(session, "boutique");

  const [demarrage, tenant, programme, perms] = await Promise.all([
    chargerDemarrage(tenantId),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true, nomBoutique: true, logoUrl: true, bannerUrl: true } }),
    prisma.programmeAffiliation.findUnique({ where: { tenantId }, select: { id: true } }),
    permissionsSession(session),
  ]);
  if (!demarrage || !tenant) redirect("/dashboard/accueil");

  const { donnees, etapes, progression: prog, completude } = demarrage;
  const publiee = donnees.statut !== "brouillon";
  // Brouillon : visible seulement par l'équipe connectée, donc sur l'adresse en cours (même session).
  const url = publiee ? await lienBoutique(tenant.slug) : `${await origineSite()}/${tenant.slug}`;
  const lienAffilies = programme ? `${await origineAxso()}/rejoindre/${programme.id}` : null;
  const prochaine = prochaineEtape(etapes);
  const prenom = session.user?.name?.split(" ")[0] ?? "";
  const peut = (cle: CleEtape) => perms[MODULE[cle]] === "ecriture";
  const termine = publiee && !prochaine;
  // Terminées repliées en bas, le reste dans l'ordre des étapes.
  const aFaire = etapes.filter((e) => e.etat !== "termine");
  const faites = etapes.filter((e) => e.etat === "termine");

  function Carte({ e }: { e: Etape }) {
    const Icone = ICONES[e.cle];
    const { texte, liste } = phraseEtape(e, donnees);
    const etat = ETATS[e.etat];
    const enAvant = prochaine?.cle === e.cle;
    return (
      <div className={`rounded-carte border bg-carte p-4 sm:p-5 ${enAvant ? "border-primaire border-2" : "border-bordure"}`}>
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-controle bg-primaire-fond text-attention flex items-center justify-center flex-shrink-0" aria-hidden><Icone size={18} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="ax-sous-titre">{t(TITRES_ETAPES[e.cle])}</h3>
              <Badge ton={etat.ton}>{t(etat.label)}</Badge>
              {e.niveau === "publier" && e.etat !== "termine" && <Badge ton="erreur">{t("Requis pour publier")}</Badge>}
              {e.niveau === "facultatif" && <span className="text-xs text-doux">{t("Facultatif")}</span>}
            </div>
            <p className="mt-1 ax-texte-secondaire">{t(texte, listeFr((liste ?? []).map((x) => t(x))))}</p>
            {e.etat !== "termine" && e.cle === "affilies" && lienAffilies && peut(e.cle) && <PartageAffilies lien={lienAffilies} nomBoutique={tenant!.nomBoutique} />}
            {peut(e.cle) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {e.cle === "produit" && e.etat !== "termine" && donnees.nbExemples > 0 && (
                  <Link href="/dashboard/produits?filtre=inactif" className={classesBouton({ variante: "sombre", taille: "compact" })}>
                    <Sparkles size={14} aria-hidden />{t("Activer un exemple d'Axia")}
                  </Link>
                )}
                <Link href={e.cle === "affilies" && !lienAffilies ? "/dashboard/affiliation" : e.href}
                  className={classesBouton({ variante: e.etat === "termine" ? "secondaire" : enAvant ? "primaire" : "secondaire", taille: "compact" })}>
                  {e.etat === "termine" ? t("Voir") : t(e.cle === "affilies" && !lienAffilies ? "Activer l'affiliation" : BOUTONS[e.cle])}<ArrowRight size={14} aria-hidden />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-section max-w-3xl">
      {/* En-tête + progression */}
      <div>
        <h1 className="ax-titre-page">
          {termine ? t("Ta boutique est en ligne") : prenom
            ? t("Bienvenue, {0} — {1} est presque prête", prenom, tenant.nomBoutique)
            : t("{0} est presque prête", tenant.nomBoutique)}
        </h1>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-carte-2 border border-bordure overflow-hidden" role="progressbar" aria-label={t("Progression du démarrage")} aria-valuenow={prog.faites} aria-valuemin={0} aria-valuemax={prog.total}>
            <div className="h-full rounded-full bg-primaire" style={{ width: `${Math.round((prog.faites / prog.total) * 100)}%` }} />
          </div>
          <span className="text-sm font-semibold text-doux flex-shrink-0">{t("{0} étapes sur {1}", prog.faites, prog.total)}</span>
        </div>
      </div>

      {badgeCompleteVisible(donnees.suivi, completude.pourcent, new Date()) && <BadgeComplete />}

      {termine && (
        <Alerte ton="succes" titre={t("Toutes les étapes sont faites.")}
          action={<Link href="/dashboard/accueil" className={classesBouton({ variante: "sombre", taille: "compact" })}>{t("Aller au Tableau de bord")}<ArrowRight size={14} aria-hidden /></Link>}>
          {t("Suis maintenant tes ventes depuis le Tableau de bord.")}
        </Alerte>
      )}

      {/* Bulle Axia : prochaine étape, ouvre le panneau AXIA avec ce contexte (?axia, lu par AxiaPanneau) */}
      {prochaine && (
        <div className="flex items-start gap-3 rounded-carte bg-secondaire text-carte p-4">
          <img src="/axia-icon.png" alt="" className="w-10 h-10 rounded-controle flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{t("Je peux t'aider à démarrer")}</p>
            <p className="text-sm text-carte/75">{t("Prochaine étape : {0}", t(TITRES_ETAPES[prochaine.cle]))}</p>
            <Link href={`/dashboard/demarrer?axia=${encodeURIComponent(t(PROMPTS_AXIA[prochaine.cle]))}`} scroll={false}
              className={classesBouton({ variante: "secondaire", taille: "compact", className: "mt-2" })}>
              <Sparkles size={14} aria-hidden />{t("Le faire avec Axia")}
            </Link>
          </div>
        </div>
      )}

      {/* Miniature de la boutique */}
      <div className="rounded-carte border border-bordure bg-carte p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="w-full sm:w-56 rounded-controle overflow-hidden border border-bordure flex-shrink-0" aria-hidden>
          <div className="h-5 bg-carte-2 flex items-center gap-1 px-2">
            {[0, 1, 2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-bordure-forte" />)}
          </div>
          <div className="h-20 bg-carte-2 bg-cover bg-center" style={tenant.bannerUrl ? { backgroundImage: `url(${tenant.bannerUrl})` } : undefined} />
          <div className="flex items-center gap-2 px-2.5 py-2">
            {tenant.logoUrl
              ? <img src={tenant.logoUrl} alt="" className="w-6 h-6 rounded-md object-cover" />
              : <span className="w-6 h-6 rounded-md bg-primaire-fond" />}
            <span className="text-xs font-bold text-encre truncate">{tenant.nomBoutique}</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-doux break-all">{url.replace(/^https?:\/\//, "")}</p>
          <div className="mt-1"><Badge ton={publiee ? "succes" : "neutre"}>{publiee ? t("En ligne") : t("Non publiée : visible par toi seulement.")}</Badge></div>
          <div className="mt-2 flex flex-wrap gap-2">
            <a href={url} target="_blank" rel="noopener noreferrer" className={classesBouton({ variante: "secondaire", taille: "compact" })}>
              {t("Voir ma boutique")}<ArrowUpRight size={14} aria-hidden />
            </a>
            {!publiee && perms.boutique === "ecriture" && <BoutonPublier variante="compact" />}
          </div>
        </div>
      </div>

      {/* Étapes à faire */}
      <div className="space-y-3">
        {aFaire.map((e) => <Carte key={e.cle} e={e} />)}
      </div>

      {/* Paiements : information, pas une étape */}
      <div className="flex items-start gap-2.5 rounded-carte bg-carte-2 px-4 py-3 ax-texte-secondaire">
        <Info size={15} className="flex-shrink-0 mt-0.5 text-doux" aria-hidden />
        <span>{t("Paiement à la livraison actif. Orange Money et MTN Mobile Money : bientôt disponibles.")}</span>
      </div>

      {!publiee && perms.boutique === "ecriture" && (
        <div className="rounded-carte border border-bordure bg-carte p-4 sm:p-5">
          <h2 className="ax-sous-titre">{t("Prêt à vendre ?")}</h2>
          <p className="ax-texte-secondaire mt-0.5 mb-3">{t("Un vrai produit actif suffit pour publier. Le reste peut se faire ensuite.")}</p>
          <BoutonPublier />
        </div>
      )}

      {/* Terminées, repliées en bas */}
      {faites.length > 0 && (
        <details className="group rounded-carte border border-bordure bg-carte">
          <summary className="cursor-pointer list-none flex items-center gap-2 px-4 min-h-12 text-sm font-semibold text-succes">
            <BadgeCheck size={16} aria-hidden />{t("Étapes terminées ({0})", faites.length)}
          </summary>
          <div className="space-y-3 p-3 pt-0">
            {faites.map((e) => <Carte key={e.cle} e={e} />)}
          </div>
        </details>
      )}
    </div>
  );
}
