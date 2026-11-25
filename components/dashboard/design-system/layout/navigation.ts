// Arborescence de la navigation marchande (MASTERPROMPT §5.2), branchée sur
// les routes existantes de /dashboard (voir docs/refonte-admin/DECISIONS.md).
// Ordre : sections principales — « Canaux de vente › » — « Applications › »
// — pied (Paramètres). Les modules propres à AXSO (caisse, sourcing,
// finance, Stella) sont présentés comme des applications installées.

import type { IconName } from "../icons/Icon";
import type { ModuleKey, Niveau } from "@/lib/permissions";
import { palierAuMoins, type Palier } from "@/lib/plans";

export type NavLink = {
  label: string;
  href: string;
  moduleKey?: ModuleKey;
  requiresPalier?: Palier;
  messageVerrou?: string;
  /** Caisse en mode « simple » : seuls les liens essentiels restent. */
  essentiel?: boolean;
  /** Préfixes supplémentaires rattachés à ce lien. */
  match?: string[];
};

export type NavSection = NavLink & {
  id: string;
  icon: IconName;
  /** Compteur affiché à droite (Commandes). */
  count?: "commandes";
  /** Pastille d'état grise. */
  dot?: boolean;
  /** Correspondance stricte sur le pathname. */
  exact?: boolean;
  sub?: NavLink[];
};

const PRO = "palier1" as const;
const MSG_PRO = "Cette fonctionnalité est disponible à partir du Palier Pro.";

export const NAV: NavSection[] = [
  { id: "home", icon: "home", label: "Accueil", href: "/dashboard/accueil", exact: true },
  {
    id: "orders", icon: "orders", label: "Commandes", href: "/dashboard/commandes", moduleKey: "commandes", count: "commandes",
    sub: [
      { label: "Brouillons et devis", href: "/dashboard/commandes/devis", moduleKey: "commandes" },
      { label: "Retours", href: "/dashboard/retours", moduleKey: "commandes", match: ["/dashboard/logistique/retours"] },
      { label: "Factures", href: "/dashboard/factures", moduleKey: "finance" },
      { label: "Livraisons", href: "/dashboard/logistique", moduleKey: "commandes" },
      { label: "Réseau de livraison", href: "/dashboard/logistique/reseau", moduleKey: "commandes" },
      { label: "Livreurs", href: "/dashboard/livreurs", moduleKey: "commandes", match: ["/dashboard/logistique/livreurs"] },
      { label: "Partenaires de livraison", href: "/dashboard/transporteurs", moduleKey: "commandes", match: ["/dashboard/logistique/transporteurs"] },
    ],
  },
  {
    id: "products", icon: "tag", label: "Produits", href: "/dashboard/produits", moduleKey: "produits",
    sub: [
      { label: "Collections", href: "/dashboard/produits/categories", moduleKey: "produits" },
      { label: "Stock", href: "/dashboard/pos/stock", moduleKey: "pos" },
      { label: "Bons de commande", href: "/dashboard/pos/achats", moduleKey: "pos", match: ["/dashboard/pos/receptions"] },
      { label: "Transferts", href: "/dashboard/pos/transferts", moduleKey: "pos" },
      { label: "Produits numériques", href: "/dashboard/produits/digital", moduleKey: "produits", match: ["/dashboard/produits/creer", "/dashboard/produits/studio", "/dashboard/produits/live"] },
    ],
  },
  {
    id: "customers", icon: "user", label: "Clients", href: "/dashboard/clients", moduleKey: "clients",
    sub: [
      { label: "Entreprises", href: "/dashboard/clients/entreprises", moduleKey: "clients" },
      { label: "Avis clients", href: "/dashboard/avis", moduleKey: "clients" },
    ],
  },
  {
    id: "growth", icon: "gauge", label: "Croissance", href: "/dashboard/marketing", moduleKey: "marketing", requiresPalier: PRO, messageVerrou: MSG_PRO,
    sub: [
      { label: "Campagnes", href: "/dashboard/campagnes", moduleKey: "marketing" },
      { label: "Publicité", href: "/dashboard/publicite" },
      { label: "E-mails", href: "/dashboard/marketing/email", moduleKey: "marketing", requiresPalier: PRO, messageVerrou: MSG_PRO },
      { label: "SMS", href: "/dashboard/sms" },
      { label: "Affiliation", href: "/dashboard/affiliation", moduleKey: "marketing" },
      { label: "Objectifs", href: "/dashboard/objectifs", moduleKey: "produits" },
    ],
  },
  { id: "discounts", icon: "discount", label: "Réductions", href: "/dashboard/marketing/codes-promo", moduleKey: "marketing", requiresPalier: PRO, messageVerrou: MSG_PRO },
  {
    id: "content", icon: "image", label: "Contenu", href: "/dashboard/fichiers", moduleKey: "boutique",
    sub: [{ label: "Fichiers", href: "/dashboard/fichiers", moduleKey: "boutique" }, { label: "Médias", href: "/dashboard/medias" }],
  },
  {
    id: "analytics", icon: "bars", label: "Analyses de données", href: "/dashboard/analytics", moduleKey: "produits",
    sub: [{ label: "Rapports", href: "/dashboard/rapports", moduleKey: "produits" }, { label: "Vue en direct", href: "/dashboard/analytics/live", moduleKey: "produits", requiresPalier: "palier2" }],
  },
];

export const CHANNELS: NavSection[] = [
  {
    id: "online-store", icon: "store", label: "Boutique en ligne", href: "/dashboard/boutique", moduleKey: "boutique",
    sub: [
      { label: "Thèmes", href: "/dashboard/themes", moduleKey: "boutique" },
      { label: "Constructeur", href: "/dashboard/builder", moduleKey: "boutique" },
      { label: "Flux produits", href: "/dashboard/feeds", moduleKey: "boutique" },
    ],
  },
  { id: "agentic", icon: "sparkle", label: "Contrôle IA", href: "/dashboard/controle-ia", requiresPalier: PRO, messageVerrou: MSG_PRO },
  { id: "coins", icon: "sparkle", label: "Coins IA", href: "/dashboard/coins" },
  { id: "whatsapp", icon: "whatsapp", label: "WhatsApp Business", href: "/dashboard/whatsapp", moduleKey: "clients" },
];

export const APPS: NavSection[] = [
  {
    id: "commande-express", icon: "bolt", label: "Commande Express", href: "/dashboard/commande-express", moduleKey: "commandes",
    sub: [
      { label: "Vue d'ensemble", href: "/dashboard/commande-express", moduleKey: "commandes" },
      { label: "Confirmation", href: "/dashboard/commande-express/confirmation", moduleKey: "commandes" },
    ],
  },
  {
    id: "axia", icon: "sparkle", label: "Stella", href: "/dashboard", exact: true, requiresPalier: PRO,
    messageVerrou: "Stella, ton assistante personnelle, est disponible à partir du Palier Pro.",
    sub: [
      { label: "Journal des décisions", href: "/dashboard/axia/journal" },
      { label: "Agents", href: "/dashboard/agents" },
      { label: "Automatisations", href: "/dashboard/automation" },
      { label: "Workflows", href: "/dashboard/automation/workflows", moduleKey: "marketing" },
      { label: "Lancements", href: "/dashboard/boutique/lancements", moduleKey: "boutique" },
      { label: "Chatbot", href: "/dashboard/chatbot" },
    ],
  },
  {
    id: "pos", icon: "monitor", label: "Caisse & magasin", href: "/dashboard/pos/caisse", moduleKey: "pos", match: ["/dashboard/pos"],
    sub: [
      { label: "Caisse", href: "/dashboard/pos/caisse", moduleKey: "pos", essentiel: true },
      { label: "Session de caisse", href: "/dashboard/pos/session", moduleKey: "pos", essentiel: true },
      { label: "Retours & avoirs", href: "/dashboard/pos/retours", moduleKey: "pos" },
      { label: "Pilotage en direct", href: "/dashboard/pos/pilotage", moduleKey: "pos" },
      { label: "Supervision des caisses", href: "/dashboard/pos/supervision", moduleKey: "pos" },
      { label: "Fiche produit", href: "/dashboard/pos/fiche", moduleKey: "pos" },
      { label: "Inventaires", href: "/dashboard/pos/inventaire", moduleKey: "pos" },
      { label: "Traçabilité", href: "/dashboard/pos/tracabilite", moduleKey: "pos", essentiel: true },
      { label: "Import / export", href: "/dashboard/pos/import", moduleKey: "pos" },
      { label: "Promotions", href: "/dashboard/pos/promotions", moduleKey: "pos" },
      { label: "Fidélité", href: "/dashboard/pos/fidelite", moduleKey: "pos" },
      { label: "Crédit clients", href: "/dashboard/pos/credit", moduleKey: "pos" },
      { label: "Analytics magasin", href: "/dashboard/pos/analytics", moduleKey: "pos" },
      { label: "Journal d'activité", href: "/dashboard/pos/journal", moduleKey: "pos" },
      { label: "Journal d'audit", href: "/dashboard/pos/audit", moduleKey: "pos" },
      { label: "Mise en route", href: "/dashboard/pos/demarrage", moduleKey: "pos" },
      { label: "Réglages de la caisse", href: "/dashboard/pos/reglages", moduleKey: "pos", essentiel: true },
    ],
  },
  {
    id: "finance", icon: "wallet", label: "Finance", href: "/dashboard/revenus", moduleKey: "finance",
    sub: [
      { label: "Revenus", href: "/dashboard/revenus", moduleKey: "finance" },
      { label: "Paiements", href: "/dashboard/paiements", moduleKey: "finance" },
      { label: "Wallet", href: "/dashboard/wallet", moduleKey: "finance" },
      { label: "Encaissements COD", href: "/dashboard/logistique/encaissements", moduleKey: "finance" },
      { label: "Rapprochement", href: "/dashboard/pos/rapprochement", moduleKey: "finance" },
      { label: "Comptabilité", href: "/dashboard/pos/comptabilite", moduleKey: "finance" },
      { label: "Charges", href: "/dashboard/pos/charges", moduleKey: "finance" },
    ],
  },
  { id: "sourcing", icon: "map", label: "AXSO Sourcing", href: "/dashboard/sourcing", moduleKey: "produits", requiresPalier: "palier2", messageVerrou: "AXSO Sourcing est disponible à partir du Palier Business." },
];

/** Applications AXSO disponibles hors de la sidebar (modale « Applis »). */
export const MORE_APPS: { icon: IconName; label: string; description: string; href: string; moduleKey?: ModuleKey }[] = [
  { icon: "calendar", label: "Planificateur", description: "Programmez vos publications sur les réseaux sociaux.", href: "/dashboard/scheduler" },
  { icon: "import", label: "Import magique", description: "Importez un catalogue depuis un lien ou un fichier.", href: "/dashboard/magic-import", moduleKey: "produits" },
  { icon: "eye", label: "Veille concurrentielle", description: "Suivez les prix et les nouveautés de vos concurrents.", href: "/dashboard/veille" },
  { icon: "users", label: "Réseau AXSO", description: "Échangez avec la communauté des marchands.", href: "/dashboard/messages" },
  { icon: "star", label: "Badges et objectifs", description: "Vos réussites et récompenses de marchand.", href: "/dashboard/gamification" },
  { icon: "help", label: "Assistance", description: "Contactez l’équipe AXSO.", href: "/dashboard/support" },
];

export const SETTINGS: NavSection = {
  id: "settings", icon: "gear", label: "Paramètres", href: "/dashboard/parametres",
  match: ["/dashboard/abonnement", "/dashboard/profil", "/dashboard/livraison", "/dashboard/entrepots", "/dashboard/connecteurs", "/dashboard/marketing/tracking"],
};

/**
 * Espaces de la barre d'onglets mobile (≤ 820px). Le premier lien autorisé de
 * chaque espace est sa page d'arrivée ; les autres deviennent ses rubriques.
 */
export const ESPACES_MOBILE: (NavSection & { sub: NavLink[]; /** Libellé de l'onglet, si le nom complet ne tient pas. */ court?: string })[] = [
  { id: "m-accueil", icon: "home", label: "Accueil", href: "/dashboard/accueil", sub: [{ label: "Accueil", href: "/dashboard/accueil" }] },
  {
    id: "m-ventes", icon: "orders", label: "Ventes", href: "/dashboard/commandes", count: "commandes",
    sub: [
      { label: "Commandes", href: "/dashboard/commandes", moduleKey: "commandes" },
      { label: "Commande Express", href: "/dashboard/commande-express", moduleKey: "commandes" },
      { label: "Confirmation", href: "/dashboard/commande-express/confirmation", moduleKey: "commandes" },
      { label: "Devis", href: "/dashboard/commandes/devis", moduleKey: "commandes" },
      { label: "Retours", href: "/dashboard/retours", moduleKey: "commandes", match: ["/dashboard/logistique/retours", "/dashboard/pos/retours"] },
      { label: "Clients", href: "/dashboard/clients", moduleKey: "clients" },
      { label: "Entreprises", href: "/dashboard/clients/entreprises", moduleKey: "clients" },
      { label: "Avis", href: "/dashboard/avis", moduleKey: "clients" },
      { label: "WhatsApp", href: "/dashboard/whatsapp", moduleKey: "clients" },
      { label: "Caisse", href: "/dashboard/pos/caisse", moduleKey: "pos", match: ["/dashboard/pos"] },
    ],
  },
  {
    id: "m-catalogue", icon: "tag", label: "Catalogue", href: "/dashboard/produits",
    sub: [
      { label: "Produits", href: "/dashboard/produits", moduleKey: "produits" },
      { label: "Collections", href: "/dashboard/produits/categories", moduleKey: "produits" },
      { label: "Stock", href: "/dashboard/pos/stock", moduleKey: "pos" },
      { label: "Inventaires", href: "/dashboard/pos/inventaire", moduleKey: "pos" },
      { label: "Bons de commande", href: "/dashboard/pos/achats", moduleKey: "pos", match: ["/dashboard/pos/receptions"] },
      { label: "Transferts", href: "/dashboard/pos/transferts", moduleKey: "pos" },
      { label: "Numériques", href: "/dashboard/produits/digital", moduleKey: "produits", match: ["/dashboard/produits/creer", "/dashboard/produits/studio", "/dashboard/produits/live"] },
      { label: "Médias", href: "/dashboard/medias" },
      { label: "Fichiers", href: "/dashboard/fichiers", moduleKey: "boutique" },
      { label: "Import magique", href: "/dashboard/magic-import", moduleKey: "produits" },
    ],
  },
  {
    id: "m-logistique", icon: "truck", label: "Logistique", href: "/dashboard/logistique",
    sub: [
      { label: "Livraisons", href: "/dashboard/logistique", moduleKey: "commandes" },
      { label: "Réseau", href: "/dashboard/logistique/reseau", moduleKey: "commandes" },
      { label: "Livreurs", href: "/dashboard/livreurs", moduleKey: "commandes", match: ["/dashboard/logistique/livreurs"] },
      { label: "Partenaires", href: "/dashboard/transporteurs", moduleKey: "commandes", match: ["/dashboard/logistique/transporteurs"] },
      { label: "Entrepôts", href: "/dashboard/entrepots", match: ["/dashboard/logistique/entrepots"] },
    ],
  },
  {
    id: "m-boutique", icon: "store", label: "Ma boutique", court: "Boutique", href: "/dashboard/ma-boutique",
    sub: [
      { label: "Ma boutique", href: "/dashboard/ma-boutique", moduleKey: "boutique" },
      { label: "Thèmes", href: "/dashboard/themes", moduleKey: "boutique" },
      { label: "Constructeur", href: "/dashboard/builder", moduleKey: "boutique" },
      { label: "Informations", href: "/dashboard/boutique", moduleKey: "boutique" },
      { label: "Codes promo", href: "/dashboard/marketing/codes-promo", moduleKey: "marketing", requiresPalier: PRO },
      { label: "Marketing", href: "/dashboard/marketing", moduleKey: "marketing", requiresPalier: PRO },
      { label: "Campagnes", href: "/dashboard/campagnes", moduleKey: "marketing" },
      { label: "Publicité", href: "/dashboard/publicite" },
      { label: "E-mails", href: "/dashboard/marketing/email", moduleKey: "marketing", requiresPalier: PRO },
      { label: "SMS", href: "/dashboard/sms" },
      { label: "Affiliation", href: "/dashboard/affiliation", moduleKey: "marketing" },
      { label: "Analyses", href: "/dashboard/analytics", moduleKey: "produits" },
      { label: "Rapports", href: "/dashboard/rapports", moduleKey: "produits" },
      { label: "Objectifs", href: "/dashboard/objectifs", moduleKey: "produits" },
      { label: "Planificateur", href: "/dashboard/scheduler" },
    ],
  },
  {
    id: "m-finances", icon: "wallet", label: "Finances", href: "/dashboard/revenus",
    sub: [
      { label: "Revenus", href: "/dashboard/revenus", moduleKey: "finance" },
      { label: "Paiements", href: "/dashboard/paiements", moduleKey: "finance" },
      { label: "Wallet", href: "/dashboard/wallet", moduleKey: "finance" },
      { label: "Factures", href: "/dashboard/factures", moduleKey: "finance" },
      { label: "Encaissements COD", href: "/dashboard/logistique/encaissements", moduleKey: "finance" },
      { label: "Rapprochement", href: "/dashboard/pos/rapprochement", moduleKey: "finance" },
      { label: "Comptabilité", href: "/dashboard/pos/comptabilite", moduleKey: "finance" },
      { label: "Charges", href: "/dashboard/pos/charges", moduleKey: "finance" },
      { label: "Coins IA", href: "/dashboard/coins" },
    ],
  },
];

// ─── Filtrage et état actif ─────────────────────────────────────────────────

export function autorise(l: NavLink, permissions?: Record<ModuleKey, Niveau>) {
  return !permissions || !l.moduleKey || permissions[l.moduleKey] !== "aucun";
}

export function verrouille(l: NavLink, palier?: Palier) {
  return !!l.requiresPalier && !palierAuMoins(palier ?? "palier0", l.requiresPalier);
}

function correspond(prefixe: string, pathname: string) {
  return pathname === prefixe || pathname.startsWith(prefixe + "/");
}

/** Longueur du préfixe le plus long qui correspond (0 si aucun). */
function score(l: NavLink & { exact?: boolean }, pathname: string): number {
  if (l.exact) return pathname === l.href ? l.href.length + 1000 : 0;
  return Math.max(0, ...[l.href, ...(l.match ?? [])].filter((p) => correspond(p, pathname)).map((p) => p.length));
}

/** Section active : celle dont un lien (section ou sous-item) correspond le plus précisément. */
export function sectionActive(sections: NavSection[], pathname: string): { section?: NavSection; sub?: NavLink } {
  let meilleur: { section?: NavSection; sub?: NavLink; s: number } = { s: 0 };
  for (const section of sections) {
    const s0 = score(section, pathname);
    if (s0 > meilleur.s) meilleur = { section, s: s0 };
    for (const sub of section.sub ?? []) {
      const s = score(sub, pathname);
      if (s > meilleur.s || (s === meilleur.s && s > 0 && meilleur.section === section && !meilleur.sub)) meilleur = { section, sub, s };
    }
  }
  return { section: meilleur.section, sub: meilleur.sub };
}

/** Pages proposées par la palette de commandes (filtrées comme la sidebar). */
export function pagesNavigables(permissions?: Record<ModuleKey, Niveau>, palier?: Palier) {
  const pages: { label: string; href: string; groupe: string; icon: IconName }[] = [];
  for (const s of [...NAV, ...CHANNELS, ...APPS, SETTINGS]) {
    if (!autorise(s, permissions)) continue;
    if (!verrouille(s, palier)) pages.push({ label: s.label, href: s.href, groupe: "", icon: s.icon });
    for (const sub of s.sub ?? []) {
      if (autorise(sub, permissions) && !verrouille(sub, palier) && sub.href !== s.href) pages.push({ label: sub.label, href: sub.href, groupe: s.label, icon: s.icon });
    }
  }
  for (const a of MORE_APPS) if (!a.moduleKey || autorise(a, permissions)) pages.push({ label: a.label, href: a.href, groupe: "Applications", icon: a.icon });
  pages.push({ label: "Mon profil", href: "/dashboard/profil", groupe: "Paramètres", icon: "user" });
  return pages;
}
