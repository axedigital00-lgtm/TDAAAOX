// Menu de l'admin marchand refondu (masterprompt §5.2) : structure cible, chemins actuels (D23).
// Mêmes entrées, mêmes droits (moduleKey), mêmes verrous de palier et même mode caisse que
// l'ancienne barre latérale (components/dashboard/Sidebar.tsx) — tests/adm-shell.test.ts le vérifie.
// Fichier pur (pas de "use client") : utilisable par la barre, le tiroir mobile, la palette et les tests.
import type { IconName } from "@/components/ui/icones";
import type { Palier } from "@/lib/plans";
import type { ModuleKey, Niveau } from "@/lib/permissions";

export interface ItemMenu {
  href: string;
  label: string;
  /** Pastille « à traiter » (commandes, messages). */
  badge?: boolean;
  /** Correspondance stricte sur le pathname. */
  exact?: boolean;
  /** Sous-pages qui ont leur propre entrée. */
  excludePrefix?: string[];
  /** Palier minimum : sinon l'entrée est cadenassée et ouvre l'offre. */
  requiresPalier?: Palier;
  messageVerrou?: string;
  /** Ouvre l'overlay abonnement au lieu de naviguer. */
  opensAbonnement?: boolean;
  /** Module de permissions : l'entrée disparaît si le niveau est « aucun ». */
  moduleKey?: ModuleKey;
  /** Sous-titre au-dessus du premier lien de chaque section d'une liste longue (Point de vente). */
  section?: string;
  /** Caisse en mode « simple » : seules les entrées essentielles restent. */
  essentiel?: boolean;
}

/** Entrée de premier niveau : son lien est le premier item visible ; les suivants sont ses sous-items. */
export interface SectionMenu {
  id: string;
  label: string;
  icon: IconName;
  /** Bloc de la barre : principal (haut), canaux de vente, applications, pied. */
  bloc: "principal" | "canaux" | "applis" | "pied";
  items: ItemMenu[];
}

export const MENU: SectionMenu[] = [
  { id: "accueil", label: "Accueil", icon: "home", bloc: "principal", items: [
    // « Accueil » = parcours de démarrage (D19) ; le tableau de bord reste à son adresse jusqu'au lot 6 (D7).
    { href: "/dashboard/demarrer", label: "Accueil", exact: true, moduleKey: "boutique" },
    { href: "/dashboard/accueil", label: "Tableau de bord", exact: true },
  ] },
  { id: "commandes", label: "Commandes", icon: "orders", bloc: "principal", items: [
    { href: "/dashboard/commandes", label: "Commandes", badge: true, excludePrefix: ["/dashboard/commandes/brouillons", "/dashboard/commandes/paniers"], moduleKey: "commandes" },
    { href: "/dashboard/commandes/brouillons", label: "Brouillons", moduleKey: "commandes" },
    { href: "/dashboard/commandes/paniers", label: "Paniers abandonnés", moduleKey: "commandes" },
    { href: "/dashboard/factures", label: "Factures", moduleKey: "finance" },
    { href: "/dashboard/retours", label: "Retours", moduleKey: "commandes" },
    { href: "/dashboard/boutique?section=livraison", label: "Livraison", moduleKey: "boutique" },
    { href: "/dashboard/livreurs", label: "Livreurs", moduleKey: "commandes" },
    { href: "/dashboard/transporteurs", label: "Transporteurs", moduleKey: "commandes" },
    { href: "/dashboard/logistique", label: "Logistique", moduleKey: "commandes", excludePrefix: ["/dashboard/logistique/encaissements"] },
  ] },
  { id: "produits", label: "Produits", icon: "tag", bloc: "principal", items: [
    { href: "/dashboard/produits", label: "Produits", excludePrefix: ["/dashboard/produits/digital", "/dashboard/produits/categories"], moduleKey: "produits" },
    { href: "/dashboard/produits/digital", label: "Produits numériques", moduleKey: "produits" },
    // « Collections » est le libellé du menu pour les catégories produits (D25).
    { href: "/dashboard/produits/categories", label: "Collections", moduleKey: "produits" },
    { href: "/dashboard/entrepots", label: "Stock et entrepôts", moduleKey: "produits" },
    { href: "/dashboard/sourcing", label: "Sourcing", requiresPalier: "palier2", moduleKey: "produits" },
  ] },
  { id: "clients", label: "Clients", icon: "user", bloc: "principal", items: [
    { href: "/dashboard/clients", label: "Clients", moduleKey: "clients", excludePrefix: ["/dashboard/clients/segments"] },
    { href: "/dashboard/clients/segments", label: "Segments", moduleKey: "clients" },
    { href: "/dashboard/avis", label: "Avis clients", moduleKey: "clients" },
  ] },
  { id: "croissance", label: "Croissance", icon: "gauge", bloc: "principal", items: [
    { href: "/dashboard/campagnes", label: "Campagnes", moduleKey: "marketing" },
    { href: "/dashboard/marketing", label: "Marketing", requiresPalier: "palier1", moduleKey: "marketing", excludePrefix: ["/dashboard/marketing/codes-promo"] },
    { href: "/dashboard/affiliation", label: "Affiliation", moduleKey: "marketing" },
    { href: "/dashboard/scheduler", label: "Planificateur", moduleKey: "marketing" },
    { href: "/dashboard/publicite", label: "Publicité Ads", moduleKey: "marketing" },
    { href: "/dashboard/sms", label: "SMS / WhatsApp", moduleKey: "marketing" },
  ] },
  { id: "reductions", label: "Réductions", icon: "discount", bloc: "principal", items: [
    // Même règle que Marketing : marketing/layout.tsx renvoie un compte Essentiel vers l'abonnement.
    { href: "/dashboard/marketing/codes-promo", label: "Réductions", requiresPalier: "palier1", moduleKey: "marketing" },
  ] },
  { id: "contenu", label: "Contenu", icon: "image", bloc: "principal", items: [
    { href: "/dashboard/fichiers", label: "Fichiers", moduleKey: "boutique" },
  ] },
  { id: "analyses", label: "Analyses de données", icon: "bars", bloc: "principal", items: [
    { href: "/dashboard/analytics", label: "Analytics", moduleKey: "produits" },
    { href: "/dashboard/rapports", label: "Rapports", moduleKey: "produits" },
    { href: "/dashboard/objectifs", label: "Objectifs", moduleKey: "produits" },
    { href: "/dashboard/revenus", label: "Revenus", moduleKey: "finance" },
    { href: "/dashboard/veille", label: "Veille concurrence", moduleKey: "marketing" },
  ] },
  { id: "boutique", label: "Boutique en ligne", icon: "store", bloc: "canaux", items: [
    { href: "/dashboard/boutique", label: "Ma boutique", exact: true, moduleKey: "boutique" },
    { href: "/dashboard/themes", label: "Thèmes", moduleKey: "boutique" },
    { href: "/dashboard/builder", label: "Constructeur", moduleKey: "boutique" },
    { href: "/dashboard/boutique/politiques", label: "Politiques", moduleKey: "boutique" },
    { href: "/dashboard/feeds", label: "Flux produits", moduleKey: "boutique" },
    { href: "/dashboard/connecteurs", label: "Connecteurs", moduleKey: "boutique" },
  ] },
  { id: "pos", label: "Point de vente", icon: "receipt", bloc: "canaux", items: [
    { href: "/dashboard/pos/caisse", label: "Caisse", moduleKey: "pos", section: "Vente", essentiel: true },
    { href: "/dashboard/pos/session", label: "Session de caisse", moduleKey: "pos", section: "Vente", essentiel: true },
    { href: "/dashboard/pos/retours", label: "Retours & avoirs", moduleKey: "pos", section: "Vente" },
    { href: "/dashboard/pos/pilotage", label: "Pilotage en direct", moduleKey: "pos", section: "Vente" },
    { href: "/dashboard/pos/supervision", label: "Supervision des caisses", moduleKey: "pos", section: "Vente" },
    { href: "/dashboard/pos/stock", label: "Gestion des stocks", moduleKey: "pos", section: "Stock", essentiel: true },
    { href: "/dashboard/pos/fiche", label: "Fiche produit", moduleKey: "pos", section: "Stock" },
    { href: "/dashboard/pos/inventaire", label: "Inventaires", moduleKey: "pos", section: "Stock" },
    { href: "/dashboard/pos/transferts", label: "Transferts de stock", moduleKey: "pos", section: "Stock" },
    { href: "/dashboard/pos/tracabilite", label: "Traçabilité", moduleKey: "pos", section: "Stock", essentiel: true },
    { href: "/dashboard/pos/achats", label: "Achats & réassort", moduleKey: "pos", section: "Achats" },
    { href: "/dashboard/pos/receptions", label: "Réceptions", moduleKey: "pos", section: "Achats" },
    { href: "/dashboard/pos/import", label: "Import / export", moduleKey: "pos", section: "Achats" },
    { href: "/dashboard/pos/promotions", label: "Promotions", moduleKey: "pos", section: "Clients en magasin" },
    { href: "/dashboard/pos/fidelite", label: "Fidélité", moduleKey: "pos", section: "Clients en magasin" },
    { href: "/dashboard/pos/credit", label: "Crédit clients", moduleKey: "pos", section: "Clients en magasin" },
    { href: "/dashboard/pos/rapprochement", label: "Rapprochement des paiements", moduleKey: "finance", section: "Finance du magasin" },
    { href: "/dashboard/pos/comptabilite", label: "Comptabilité", moduleKey: "finance", section: "Finance du magasin", essentiel: true },
    { href: "/dashboard/pos/charges", label: "Charges d'exploitation", moduleKey: "finance", section: "Finance du magasin", essentiel: true },
    { href: "/dashboard/logistique/encaissements", label: "Encaissements COD", moduleKey: "finance", section: "Finance du magasin", essentiel: true },
    { href: "/dashboard/pos/analytics", label: "Analytics magasin", moduleKey: "pos", section: "Suivi" },
    { href: "/dashboard/pos/journal", label: "Journal d'activité", moduleKey: "pos", section: "Suivi" },
    { href: "/dashboard/pos/audit", label: "Journal d'audit", moduleKey: "pos", section: "Suivi" },
    { href: "/dashboard/pos/demarrage", label: "Mise en route", moduleKey: "pos", section: "Configuration" },
    { href: "/dashboard/pos/reglages", label: "Réglages de la caisse", moduleKey: "pos", section: "Configuration", essentiel: true },
  ] },
  { id: "whatsapp", label: "WhatsApp Business", icon: "whatsapp", bloc: "canaux", items: [
    { href: "/dashboard/whatsapp", label: "WhatsApp Business", badge: true, moduleKey: "clients" },
  ] },
  { id: "controle-ia", label: "Contrôle IA", icon: "sparkle", bloc: "applis", items: [
    { href: "/dashboard/controle-ia", label: "Contrôle IA", requiresPalier: "palier1" },
  ] },
  { id: "argent", label: "Mon argent", icon: "money", bloc: "pied", items: [
    { href: "/dashboard/wallet", label: "Mon argent", moduleKey: "finance" },
  ] },
  { id: "parametres", label: "Paramètres", icon: "gear", bloc: "pied", items: [
    { href: "/dashboard/parametres", label: "Paramètres", moduleKey: "parametres" },
    { href: "/dashboard/abonnement", label: "Forfait", opensAbonnement: true, moduleKey: "finance" },
  ] },
];

/** Sections de la barre Paramètres (§9.1) : uniquement les pages qui existent (PLAN §3.2). */
export const SECTIONS_PARAMETRES: (ItemMenu & { icon: IconName })[] = [
  { href: "/dashboard/parametres", label: "Général", icon: "gear", exact: true, moduleKey: "parametres" },
  { href: "/dashboard/abonnement", label: "Forfait", icon: "card", moduleKey: "finance" },
  { href: "/dashboard/parametres/equipe", label: "Utilisateurs", icon: "users", moduleKey: "equipe" },
  { href: "/dashboard/parametres/paiements", label: "Paiements", icon: "card", moduleKey: "parametres" },
  { href: "/dashboard/parametres/formulaire-commande", label: "Formulaire de commande", icon: "orders", moduleKey: "parametres" },
  { href: "/dashboard/boutique?section=livraison", label: "Expédition et livraison", icon: "truck", moduleKey: "boutique" },
  { href: "/dashboard/entrepots", label: "Emplacements", icon: "pin", moduleKey: "produits" },
  { href: "/dashboard/connecteurs", label: "Applications", icon: "grid", moduleKey: "boutique" },
  { href: "/dashboard/parametres/domaine", label: "Domaines", icon: "globe", moduleKey: "parametres" },
  { href: "/dashboard/marketing/tracking", label: "Événements clients", icon: "bolt", moduleKey: "marketing", requiresPalier: "palier1" },
  { href: "/dashboard/parametres/notifications", label: "Notifications", icon: "bell", moduleKey: "parametres" },
  { href: "/dashboard/parametres/langues", label: "Langues", icon: "language" },
  { href: "/dashboard/boutique/politiques", label: "Politiques", icon: "doc", moduleKey: "boutique" },
  { href: "/dashboard/profil", label: "Mon profil", icon: "user" },
];

const TOUS_ITEMS = MENU.flatMap((s) => s.items);
const HREFS_AVEC_QUERY = TOUS_ITEMS.map((it) => it.href).filter((h) => h.includes("?"));

export function filtreParPermission<T extends { moduleKey?: ModuleKey }>(items: T[], permissions?: Record<ModuleKey, Niveau>): T[] {
  if (!permissions) return items;
  return items.filter((it) => !it.moduleKey || permissions[it.moduleKey] !== "aucun");
}

/** Le lien (avec ou sans query) correspond-il à l'adresse courante ? Une clé sans valeur exige seulement sa présence. */
function correspond(href: string, pathname: string, searchParams: URLSearchParams): boolean {
  const [base, query] = href.split("?");
  if (pathname !== base) return false;
  for (const [cle, valeur] of new URLSearchParams(query ?? "")) {
    if (valeur ? searchParams.get(cle) !== valeur : !searchParams.has(cle)) return false;
  }
  return true;
}

export function estActif(item: Pick<ItemMenu, "href" | "exact" | "excludePrefix">, pathname: string, searchParams: URLSearchParams): boolean {
  if (item.excludePrefix?.some((p) => pathname.startsWith(p))) return false;
  const [base, query] = item.href.split("?");
  if (query) return correspond(item.href, pathname, searchParams);
  // Un lien plus précis (même page + query) prend la main : sur /dashboard/boutique?section=livraison, seule « Livraison » est active.
  if (HREFS_AVEC_QUERY.some((h) => correspond(h, pathname, searchParams))) return false;
  if (item.exact) return pathname === base;
  return base !== "/dashboard" ? pathname.startsWith(base) : pathname === base;
}

/** Sections visibles pour cette session : items sans accès retirés, section vide retirée,
 *  caisse « simple » réduite aux essentiels (+ la page en cours). */
export function sectionsVisibles(permissions: Record<ModuleKey, Niveau> | undefined, modePos: "simple" | "pro", pathname: string, searchParams: URLSearchParams) {
  return MENU
    .map((s) => ({ ...s, items: filtreParPermission(s.items, permissions) }))
    .map((s) => (s.id === "pos" && modePos === "simple"
      ? { ...s, items: s.items.filter((it) => it.essentiel || estActif(it, pathname, searchParams)) }
      : s))
    .filter((s) => s.items.length > 0);
}

/** Pages proposées par la palette (Ctrl+K), filtrées comme le menu. */
export function pagesMenu(permissions?: Record<ModuleKey, Niveau>) {
  return MENU.flatMap((s) => filtreParPermission(s.items, permissions).map((it) => ({ ...it, groupe: s.label === it.label ? "" : s.label })));
}
