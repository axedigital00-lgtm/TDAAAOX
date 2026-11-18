// Textes du parcours de démarrage (page Accueil, bandeau de complétude, relances, Axia).
// Partie pure. Chaque « conséquence » décrit ce que le code fait réellement (vérifié le 17/11/2026) :
//  - livraison : sans zone, le client tape sa ville et paie le tarif standard (lib/livraison.ts) ;
//  - politiques : seul ce qui est validé apparaît sur la vitrine (lib/politiques.ts, politiquesPubliees) ;
//  - coordonnées : la page Contact n'affiche que les champs renseignés (app/(storefront)/[slug]/contact).
// Les textes sont des clés i18n (texte français) : les traduire au rendu avec t().
import type { CleEtape, Etape } from "@/lib/demarrage-regles";

export const TITRES_ETAPES: Record<CleEtape, string> = {
  produit: "Ajouter mon premier produit",
  constructeur: "Construire ma boutique",
  livraison: "Configurer les zones de livraison",
  politiques: "Rédiger mes politiques",
  coordonnees: "Compléter mes coordonnées",
  affilies: "Recruter des affiliés",
  domaine: "Obtenir un nom de domaine",
};

export interface ContexteTextes {
  nbExemples?: number;
  adresse?: string | null;
  horaires?: string | null;
  email?: string | null;
}

/**
 * Une phrase par carte : ce qui se passe réellement tant que l'étape n'est pas terminée.
 * `liste` remplit le « {0} » du texte (chaque élément est lui-même une clé i18n).
 */
export function phraseEtape(e: Pick<Etape, "cle" | "etat">, c: ContexteTextes = {}): { texte: string; liste?: string[] } {
  return { texte: texteEtape(e, c), ...(e.cle === "coordonnees" && e.etat !== "termine" ? { liste: champsCoordonneesManquants(c) } : {}) };
}

function texteEtape(e: Pick<Etape, "cle" | "etat">, c: ContexteTextes): string {
  if (e.etat === "termine") {
    return ({
      produit: "Tu as au moins un produit en vente.",
      constructeur: "Tu as personnalisé ta boutique dans le constructeur.",
      livraison: "Tes clients choisissent leur zone et voient son tarif avant de commander.",
      politiques: "Tes 4 politiques sont validées et visibles dans le pied de page de ta boutique.",
      coordonnees: "Ta page Contact affiche ton adresse, ton e-mail et tes horaires.",
      affilies: "Ton lien de recrutement d'affiliés a été partagé.",
      domaine: "Ta boutique est sur ton propre nom de domaine.",
    } as Record<CleEtape, string>)[e.cle];
  }
  switch (e.cle) {
    case "produit":
      return c.nbExemples
        ? "Axia a préparé des produits d'exemple, invisibles pour tes clients. Vérifie le prix, la photo et le stock, puis active au moins un produit : c'est la seule condition pour publier."
        : "Ajoute au moins un vrai produit, avec son prix et sa photo : c'est la seule condition pour publier.";
    case "constructeur":
      return "Ta boutique utilise le design et les textes préparés par Axia. Vérifie-les et enregistre-les dans le constructeur avant que tes clients les voient.";
    case "livraison":
      return e.etat === "axia"
        ? "Axia a proposé des zones de livraison. Vérifie leurs tarifs et enregistre-les : ce sont eux que tes clients paieront."
        : "Sans zones, tes clients ne choisissent pas leur quartier : le même tarif standard s'applique partout.";
    case "politiques":
      return "Tant qu'elles ne sont pas validées, tes conditions de livraison et de retour n'apparaissent pas dans le pied de page de ta boutique : les clients hésitent à commander.";
    case "coordonnees":
      return champsCoordonneesManquants(c).length
        ? "Ta page Contact n'affiche pas encore : {0}."
        : "Ta page Contact n'est pas encore complète.";
    case "affilies":
      return "Des affiliés peuvent faire connaître ta boutique contre une commission. Partage ton lien de recrutement pour trouver les premiers.";
    case "domaine":
      return "Facultatif : ta boutique fonctionne déjà avec son adresse Axso.";
  }
}

export function champsCoordonneesManquants(c: ContexteTextes): string[] {
  const vide = (s?: string | null) => !s?.trim();
  return [
    vide(c.adresse) && "ton adresse",
    vide(c.email) && "ton e-mail",
    vide(c.horaires) && "tes horaires",
  ].filter(Boolean) as string[];
}

/** « a », « a et b », « a, b et c ». */
export function listeFr(x: string[]): string {
  return x.length <= 1 ? (x[0] ?? "") : `${x.slice(0, -1).join(", ")} et ${x[x.length - 1]}`;
}

/** Demande envoyée au chat AXIA pour faire l'étape avec lui (bulle de l'Accueil, constat proactif). */
export const PROMPTS_AXIA: Record<CleEtape, string> = {
  produit: "Aide-moi à ajouter mon premier vrai produit : demande-moi son nom, son prix, sa photo et son stock, puis crée-le.",
  constructeur: "Vérifie avec moi les textes et les images de ma boutique et dis-moi ce qu'il faut changer avant que mes clients les voient.",
  livraison: "Aide-moi à configurer mes zones de livraison : demande-moi les quartiers ou villes que je livre et le tarif de chacun, puis enregistre-les.",
  politiques: "Aide-moi à compléter et valider mes politiques de livraison, de retours, de confidentialité et mes conditions de vente. Demande-moi ce que tu ne sais pas.",
  coordonnees: "Aide-moi à compléter les coordonnées de ma boutique : adresse, e-mail de contact et horaires d'ouverture.",
  affilies: "Aide-moi à recruter mes premiers affiliés : rédige un message court pour partager mon lien de recrutement sur WhatsApp.",
  domaine: "Explique-moi comment brancher mon propre nom de domaine sur ma boutique.",
};

/** Question courte d'AXIA quand il propose l'étape de lui-même (constat). */
export const QUESTIONS_AXIA: Record<CleEtape, string> = {
  produit: "Ta boutique n'a encore aucun produit actif. On ajoute ton premier produit ensemble ?",
  constructeur: "Ta boutique utilise encore le design préparé par Axia, pas encore vérifié. On le relit ensemble ?",
  livraison: "Tes zones de livraison ne sont pas encore configurées : tes clients paient le même tarif partout. Je prépare tes zones de livraison ?",
  politiques: "Tes politiques de livraison et de retours ne sont pas encore validées : elles n'apparaissent pas sur ta boutique. On les termine ensemble ?",
  coordonnees: "Ta page Contact est incomplète. On complète ton adresse, ton e-mail et tes horaires ?",
  affilies: "Personne ne fait encore la promotion de ta boutique. Je rédige un message pour recruter tes premiers affiliés ?",
  domaine: "Tu veux brancher ton propre nom de domaine sur ta boutique ?",
};

/** Message WhatsApp prérédigé pour recruter des affiliés : {0} = nom de la boutique, {1} = lien /rejoindre/{programmeId}. */
export const MODELE_RECRUTEMENT_AFFILIES =
  "Bonjour ! Je cherche des personnes pour faire connaître ma boutique {0}. Tu recommandes mes produits avec ton lien personnel et tu touches une commission sur les ventes que tu apportes. Inscription gratuite ici : {1}";

/** Partage de la boutique après publication : {0} = nom, {1} = lien. */
export const MODELE_PARTAGE_BOUTIQUE = "Ma boutique {0} est en ligne ! Découvre mes produits et commande ici : {1}";

/** Lien WhatsApp « partager un texte » (sans destinataire). */
export const lienWhatsapp = (texte: string) => `https://wa.me/?text=${encodeURIComponent(texte)}`;

/** Relance J+1 / J+3 / J+7 après publication : notification, push et e-mail. Lien = première étape manquante. */
export function messageRelance(k: "j1" | "j3" | "j7", manquantes: Pick<Etape, "cle" | "href">[], pourcent: number) {
  if (!manquantes.length) return null;
  const noms = manquantes.map((e) => TITRES_ETAPES[e.cle].toLowerCase());
  const titre = k === "j1"
    ? "Ta boutique est en ligne : il reste quelques réglages"
    : k === "j3"
      ? `Ta boutique est complète à ${pourcent} %`
      : "Dernier rappel pour compléter ta boutique";
  const message = `Pour bien vendre, il te reste : ${listeFr(noms)}. Commence par « ${TITRES_ETAPES[manquantes[0].cle]} ».`;
  return { titre, message, lien: manquantes[0].href };
}
