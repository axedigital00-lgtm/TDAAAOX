// Index de recherche du tableau de bord marchand — partagé par le champ « Rechercher… » de la barre
// latérale (components/dashboard/Sidebar.tsx) et la recherche globale Ctrl+K
// (components/dashboard/RechercheDashboard.tsx). Pur : aucun import React ni serveur.
//
// Correspondance : sans accents ni majuscules, mots vides ignorés, tolérante aux petites fautes
// (distance d'édition 1, ou 2 pour les mots longs). Chaque mot de la recherche doit trouver un écho.
import type { ModuleKey } from "@/lib/permissions";

/** Mots-clés et synonymes de chaque page du menu, par href (en plus de son libellé et de son groupe). */
export const MOTS_CLES: Record<string, string> = {
  "/dashboard/demarrer": "démarrer démarrage commencer étapes checklist premiers pas publier mise en ligne lancer boutique complète",
  "/dashboard/accueil": "tableau de bord statistiques chiffres ventes du jour résumé aperçu dashboard",
  "/dashboard/boutique": "ma boutique profil informations nom logo bannière référencement seo réseaux sociaux multi boutique zones frais livraison statut",
  "/dashboard/boutique/politiques": "politique politiques cgv conditions générales de vente retours remboursement confidentialité données personnelles mentions légales livraison",
  "/dashboard/boutique?section=livraison": "livraison expédition expédier frais de port zones tarifs délai transport colis envoyer",
  "/dashboard/commandes": "commandes ventes achats clients panier paiement à la livraison cod suivi statut",
  "/dashboard/factures": "factures facturation reçus devis tva comptabilité",
  "/dashboard/retours": "retours remboursement échange réclamation litige rma",
  "/dashboard/pos/caisse": "caisse point de vente pos magasin encaisser vendre en boutique ticket",
  "/dashboard/pos/session": "session ouverture fermeture caisse fond de caisse clôture z",
  "/dashboard/pos/retours": "avoirs retours magasin remboursement",
  "/dashboard/pos/pilotage": "pilotage direct temps réel ventes magasin",
  "/dashboard/pos/supervision": "supervision caisses caissiers terminaux",
  "/dashboard/pos/stock": "stock inventaire quantités rupture réapprovisionnement",
  "/dashboard/pos/fiche": "fiche produit code barre étiquette",
  "/dashboard/pos/inventaire": "inventaire comptage stock",
  "/dashboard/pos/transferts": "transfert stock entrepôt dépôt",
  "/dashboard/pos/tracabilite": "traçabilité mouvements stock historique",
  "/dashboard/pos/achats": "achats réassort fournisseurs commandes fournisseur",
  "/dashboard/pos/receptions": "réceptions marchandise livraison fournisseur",
  "/dashboard/pos/import": "import export excel csv fichier",
  "/dashboard/pos/promotions": "promotions réductions soldes remise code promo",
  "/dashboard/pos/fidelite": "fidélité points carte client récompense",
  "/dashboard/pos/credit": "crédit dette ardoise clients paiement différé",
  "/dashboard/pos/rapprochement": "rapprochement paiements mobile money banque",
  "/dashboard/pos/comptabilite": "comptabilité bilan recettes dépenses",
  "/dashboard/pos/charges": "charges dépenses loyer salaires frais",
  "/dashboard/logistique/encaissements": "encaissements cod paiement à la livraison argent livreur remise",
  "/dashboard/pos/analytics": "analytics statistiques magasin",
  "/dashboard/pos/journal": "journal activité historique",
  "/dashboard/pos/audit": "audit sécurité traces",
  "/dashboard/pos/demarrage": "mise en route configuration caisse démarrer",
  "/dashboard/pos/reglages": "réglages caisse imprimante ticket mode simple pro",
  "/dashboard/clients": "clients acheteurs contacts fichier client",
  "/dashboard/avis": "avis étoiles notes commentaires témoignages",
  "/dashboard/whatsapp": "whatsapp messages discussion conversation",
  "/dashboard/livreurs": "livreurs coursiers motos livraison équipe",
  "/dashboard/produits": "produits articles catalogue ajouter produit prix photos stock variantes",
  "/dashboard/produits/digital": "produits digitaux numériques ebook formation fichier téléchargement pdf cours",
  "/dashboard/produits/categories": "catégories collections rayons classement",
  "/dashboard/entrepots": "entrepôts dépôts magasins stock emplacement",
  "/dashboard/sourcing": "sourcing fournisseurs chine importer grossiste",
  "/dashboard/themes": "thèmes modèles templates design apparence",
  "/dashboard/builder": "constructeur éditeur personnaliser design couleurs polices logo pages sections pied de page menu bannière",
  "/dashboard/fichiers": "fichiers médias images photos vidéos documents",
  "/dashboard/transporteurs": "transporteurs expédition colis transport",
  "/dashboard/connecteurs": "connecteurs intégrations applications facebook google pixel",
  "/dashboard/controle-ia": "contrôle ia automatisations axia agents",
  "/dashboard/feeds": "flux produits feed facebook google shopping catalogue",
  "/dashboard/campagnes": "campagnes notifications push sms emailing relances",
  "/dashboard/analytics": "analytics statistiques visites trafic conversion",
  "/dashboard/objectifs": "objectifs cibles chiffre d'affaires",
  "/dashboard/rapports": "rapports export pdf bilan",
  "/dashboard/marketing": "marketing publicité promotions codes promo",
  "/dashboard/affiliation": "affiliation affiliés commissions parrainage ambassadeurs lien",
  "/dashboard/wallet": "mon argent wallet portefeuille retirer retrait solde disponible en attente séquestre mobile money orange money mtn paiements transactions encaissements notchpay",
  "/dashboard/revenus": "revenus gains chiffre d'affaires commissions argent",
  "/dashboard/abonnement": "abonnement forfait plan palier pro payer facturation",
  "/dashboard/parametres": "réglages paramètres configuration coordonnées whatsapp formulaire moyens de paiement",
};

/** Pages et sections hors menu, indexées pour la recherche (ex. « horaires » → Réglages › Coordonnées). */
export interface EntreeIndex { href: string; label: string; groupe: string; mots: string; moduleKey?: ModuleKey }

export const SECTIONS_INDEX: EntreeIndex[] = [
  { href: "/dashboard/parametres#coordonnees", label: "Coordonnées", groupe: "Réglages", moduleKey: "parametres",
    mots: "coordonnées adresse horaires heures d'ouverture email e-mail téléphone contact localisation page contact" },
  { href: "/dashboard/parametres", label: "Informations générales", groupe: "Réglages", moduleKey: "parametres",
    mots: "nom de la boutique description catégorie pays devise monnaie" },
  { href: "/dashboard/parametres", label: "WhatsApp Business", groupe: "Réglages", moduleKey: "parametres",
    mots: "numéro whatsapp confirmations de commande téléphone" },
  { href: "/dashboard/parametres", label: "Formulaire de commande", groupe: "Réglages", moduleKey: "parametres",
    mots: "formulaire commande champs gps email acheteur champ personnalisé" },
  { href: "/dashboard/parametres", label: "Moyens de paiement", groupe: "Réglages", moduleKey: "parametres",
    mots: "paiement à la livraison cod mobile money moyens de paiement pays" },
  { href: "/dashboard/parametres/domaine", label: "Domaine personnalisé", groupe: "Réglages", moduleKey: "parametres",
    mots: "domaine nom de domaine adresse url site web lien dns .com" },
  { href: "/dashboard/parametres/notifications", label: "Notifications", groupe: "Réglages", moduleKey: "parametres",
    mots: "notifications alertes e-mail email push sons" },
  { href: "/dashboard/parametres/equipe", label: "Équipe", groupe: "Réglages", moduleKey: "equipe",
    mots: "équipe collaborateurs employés membres accès permissions rôles caissier gérant" },
  { href: "/dashboard/profil", label: "Mon profil", groupe: "Compte",
    mots: "profil compte mot de passe sécurité photo nom e-mail connexion" },
];

// ─── Correspondance ──────────────────────────────────────────────────────────

export const normaliser = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const MOTS_VIDES = new Set(["de", "du", "des", "la", "le", "les", "l", "d", "un", "une", "mon", "ma", "mes", "ton", "ta", "tes",
  "et", "ou", "a", "au", "aux", "en", "pour", "par", "sur", "je", "j", "veux", "comment", "ou", "faire", "the", "my", "to"]);

const mots = (t: string) => normaliser(t).split(/[^a-z0-9.]+/).filter(Boolean);

/** Distance de Levenshtein, arrêtée dès qu'elle dépasse `max` (renvoie alors max + 1). */
export function distance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prec = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cour = [i];
    let mini = i;
    for (let j = 1; j <= b.length; j++) {
      cour[j] = Math.min(prec[j] + 1, cour[j - 1] + 1, prec[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      mini = Math.min(mini, cour[j]);
    }
    if (mini > max) return max + 1;
    prec = cour;
  }
  return prec[b.length];
}

/** Proximité d'un mot de la recherche avec un mot indexé : 3 début, 2 contenu, 1 petite faute, 0 rien. */
function proximite(q: string, w: string): number {
  if (w.startsWith(q)) return 3;
  if (q.length >= 3 && w.includes(q)) return 2;
  if (q.length < 4) return 0;
  const tolerance = q.length >= 7 ? 2 : 1;
  // Faute dans le mot entier (« livraisn ») ou dans son début (« politq » pour « politique »).
  if (distance(q, w, tolerance) <= tolerance) return 1;
  if (q.length >= 5 && w.length > q.length && distance(q, w.slice(0, q.length), 1) <= 1) return 1;
  return 0;
}

/**
 * Score d'une entrée pour une recherche (0 = pas de correspondance). `principal` = libellé (pèse plus),
 * `secondaires` = groupe, mots-clés, synonymes.
 */
export function scoreRecherche(requete: string, principal: string, secondaires: string[] = []): number {
  const tous = mots(requete);
  const utiles = tous.filter((m) => !MOTS_VIDES.has(m));
  const termes = utiles.length ? utiles : tous;
  if (!termes.length) return 0;
  const motsLabel = mots(principal);
  const motsAutres = secondaires.flatMap(mots);
  let total = 0;
  for (const q of termes) {
    const label = Math.max(0, ...motsLabel.map((w) => proximite(q, w)));
    const best = Math.max(label ? label + 1 : 0, ...motsAutres.map((w) => proximite(q, w)));
    if (!best) return 0;
    total += best;
  }
  // Libellé entier tapé tel quel : en tête.
  if (normaliser(principal).startsWith(normaliser(requete.trim()))) total += 5;
  return total;
}

/** Entrées qui correspondent, de la plus pertinente à la moins pertinente. */
export function chercher<T>(entrees: T[], requete: string, textes: (e: T) => { principal: string; secondaires?: string[] }): T[] {
  if (!requete.trim()) return [];
  return entrees
    .map((e, i) => { const x = textes(e); return { e, i, s: scoreRecherche(requete, x.principal, x.secondaires) }; })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.e);
}

/** Textes d'une page du menu : libellé (et sa traduction), groupe, mots-clés de l'index. */
export function textesPage(p: { href: string; label: string; groupe?: string }, traduire: (s: string) => string = (s) => s) {
  return {
    principal: `${p.label} ${traduire(p.label)}`,
    secondaires: [p.groupe ?? "", p.groupe ? traduire(p.groupe) : "", MOTS_CLES[p.href] ?? MOTS_CLES[p.href.split("?")[0]] ?? ""],
  };
}
