// Parcours de démarrage du marchand : état réel de chaque étape (page Accueil, jauge de complétude,
// pastilles du menu, relances). Partie pure : les données sont chargées par lib/demarrage.ts.
import { TYPES_POLITIQUES, statutPolitique, type Politiques } from "@/lib/politiques";

export type CleEtape = "produit" | "constructeur" | "livraison" | "politiques" | "coordonnees" | "affilies" | "domaine";
export type NiveauEtape = "publier" | "vendre" | "facultatif";
/** a_faire (gris) · axia = « Préparé par Axia — à vérifier » · termine (vert). */
export type EtatEtape = "a_faire" | "axia" | "termine";

/** Tenant.demarrage (JSON). Dates en ISO. */
export interface SuiviDemarrage {
  constructeurEnregistreLe?: string;
  livraisonConfirmeeLe?: string;
  lienAffiliesPartageLe?: string;
  /** Première publication (statut brouillon → active) : point de départ des relances. */
  publieeLe?: string;
  /** Passage à 100 % des étapes « Pour bien vendre » : badge « Boutique complète » 7 jours. */
  completeLe?: string | null;
  /** « Plus tard » sur le bandeau de complétude : réduit jusqu'à cette date (24 h). */
  bandeauReduitJusqua?: string;
  /** Relances J+1 / J+3 / J+7 après publication déjà envoyées. */
  relances?: Partial<Record<"j1" | "j3" | "j7", string>>;
}

export interface DonneesDemarrage {
  statut: string; // Tenant.statut
  digital: boolean; // themeConfig.modeBoutique === "digital"
  nbProduitsActifs: number;
  nbExemples: number; // produits d'exemple d'Axia encore inactifs
  zones: { frais: number | null }[]; // parametresLivraison.zones
  politiques: Politiques;
  adresse?: string | null;
  horaires?: string | null;
  email?: string | null;
  domaineActif: boolean;
  suivi: SuiviDemarrage;
}

export interface Etape {
  cle: CleEtape;
  niveau: NiveauEtape;
  etat: EtatEtape;
  href: string;
}

export const HREF_ETAPES: Record<CleEtape, string> = {
  produit: "/dashboard/produits/nouveau",
  constructeur: "/dashboard/builder",
  // Les zones et leurs tarifs se règlent dans Ma boutique › Livraison (/dashboard/livraison = règles avancées).
  livraison: "/dashboard/boutique?section=livraison",
  politiques: "/dashboard/boutique/politiques",
  coordonnees: "/dashboard/parametres#coordonnees",
  affilies: "/dashboard/affiliation",
  domaine: "/dashboard/parametres/domaine",
};

const rempli = (s?: string | null) => !!s?.trim();

export function lireSuivi(brut: unknown): SuiviDemarrage {
  return (brut && typeof brut === "object" && !Array.isArray(brut) ? brut : {}) as SuiviDemarrage;
}

/** Étapes dans l'ordre de l'Accueil. La livraison n'existe pas pour une boutique 100 % digitale. */
export function calculerEtapes(d: DonneesDemarrage): Etape[] {
  const e = (cle: CleEtape, niveau: NiveauEtape, etat: EtatEtape): Etape => ({ cle, niveau, etat, href: HREF_ETAPES[cle] });
  const statuts = TYPES_POLITIQUES.map((t) => statutPolitique(d.politiques[t]));
  const etapes: Etape[] = [
    e("produit", "publier", d.nbProduitsActifs > 0 ? "termine" : d.nbExemples > 0 ? "axia" : "a_faire"),
    e("constructeur", "vendre", d.suivi.constructeurEnregistreLe ? "termine" : "axia"),
  ];
  if (!d.digital) {
    const avecTarif = d.zones.some((z) => z.frais != null);
    etapes.push(e("livraison", "vendre",
      d.suivi.livraisonConfirmeeLe && avecTarif ? "termine" : d.zones.length > 0 ? "axia" : "a_faire"));
  }
  etapes.push(
    e("politiques", "vendre",
      statuts.every((s) => s === "validee") ? "termine" : statuts.some((s) => s !== "absente") ? "axia" : "a_faire"),
    e("coordonnees", "vendre", rempli(d.adresse) && rempli(d.horaires) && rempli(d.email) ? "termine" : "a_faire"),
    e("affilies", "vendre", d.suivi.lienAffiliesPartageLe ? "termine" : "a_faire"),
    e("domaine", "facultatif", d.domaineActif ? "termine" : "a_faire"),
  );
  return etapes;
}

/** Progression de l'en-tête (« 2 étapes sur 6 ») : étape à publier + étapes « Pour bien vendre ». */
export function progression(etapes: Etape[]) {
  const comptees = etapes.filter((x) => x.niveau !== "facultatif");
  return { faites: comptees.filter((x) => x.etat === "termine").length, total: comptees.length };
}

/** Jauge « Boutique complète à X % » : uniquement les étapes « Pour bien vendre ». */
export function completude(etapes: Etape[]) {
  const vendre = etapes.filter((x) => x.niveau === "vendre");
  const manquantes = vendre.filter((x) => x.etat !== "termine");
  const pourcent = vendre.length ? Math.round(((vendre.length - manquantes.length) / vendre.length) * 100) : 100;
  return { pourcent, manquantes };
}

/** Prochaine étape non terminée (bulle Axia, carte mise en avant). */
export const prochaineEtape = (etapes: Etape[]) => etapes.find((x) => x.etat !== "termine" && x.niveau !== "facultatif") ?? null;

const JOUR = 86400_000;
export const DUREE_BADGE_COMPLETE = 7 * JOUR;

/**
 * Nouvelle valeur de `completeLe` : posée au passage à 100 %, effacée si une étape redevient incomplète.
 * Retourne undefined si rien ne change.
 */
export function majCompleteLe(suivi: SuiviDemarrage, pourcent: number, maintenant: Date): string | null | undefined {
  if (pourcent >= 100) return suivi.completeLe ? undefined : maintenant.toISOString();
  return suivi.completeLe ? null : undefined;
}

/** Badge « Boutique complète » : 7 jours après le passage à 100 %, et seulement tant que c'est vrai. */
export const badgeCompleteVisible = (suivi: SuiviDemarrage, pourcent: number, maintenant: Date) =>
  pourcent >= 100 && !!suivi.completeLe && maintenant.getTime() - new Date(suivi.completeLe).getTime() < DUREE_BADGE_COMPLETE;

/** Bandeau de complétude : boutique publiée, pas à 100 %, pas réduit (« Plus tard » = 24 h). */
export const bandeauVisible = (suivi: SuiviDemarrage, pourcent: number, maintenant: Date) =>
  pourcent < 100 && !(suivi.bandeauReduitJusqua && new Date(suivi.bandeauReduitJusqua) > maintenant);

/** Relance due (J+1, J+3, J+7 après publication), une seule fois chacune, tant qu'il reste des étapes. */
export function relanceDue(suivi: SuiviDemarrage, pourcent: number, maintenant: Date): "j1" | "j3" | "j7" | null {
  if (!suivi.publieeLe || pourcent >= 100) return null;
  const jours = (maintenant.getTime() - new Date(suivi.publieeLe).getTime()) / JOUR;
  const dues = (["j7", "j3", "j1"] as const).filter((k) => jours >= Number(k.slice(1)));
  const k = dues[0];
  // Seulement la plus récente échéance atteinte : pas de rafale si le cron a raté des jours.
  return k && !suivi.relances?.[k] ? k : null;
}
