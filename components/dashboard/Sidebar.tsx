"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar unique — navigation principale du dashboard marchand.
//
// Refonte : plus de sous-sidebars "Boutique" / "Point de vente". Elles
// dérivaient leur état du pathname (BOUTIQUE_ROUTES / POS_ROUTES) et le
// moindre lien hors de ces listes (ex: "Commandes", "Produits") renvoyait
// l'utilisateur d'office sur la sidebar principale — changement de contexte
// involontaire en pleine navigation. Une seule sidebar, avec des groupes
// repliables, supprime ce problème à la racine : tous les liens sont
// accessibles au même endroit, quel que soit le chemin courant.
//
// Un groupe s'ouvre d'office quand il contient la route active, et se replie
// au clic sur son en-tête. Ses liens sont filtrés par permissions d'équipe.
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { chercher, textesPage } from "@/lib/recherche-dashboard";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { BoutiqueSwitcher } from "@/components/dashboard/BoutiqueSwitcher";
import { AvatarCompte } from "@/components/dashboard/AvatarCompte";
import {
  Home, ShoppingCart, Monitor, Users, Package, Download,
  Star, Truck, MessageSquare, BarChart3, Megaphone,
  DollarSign, CreditCard, Wallet, Map, Box, Rocket,
  Settings2, ExternalLink, UserCheck, LayoutGrid, Plug, Link2,
  Bell, ChevronDown, ChevronRight, RotateCcw, FileText, Lock,
  Target, FileBarChart, Sparkles, Boxes, Receipt, Calculator, Store,
  Tags, FolderOpen, Search, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { useAbonnementOverlay } from "@/components/dashboard/AbonnementOverlayProvider";
import { palierAuMoins, type Palier } from "@/lib/plans";
import type { ModuleKey, Niveau } from "@/lib/permissions";
import { useT } from "@/components/I18nProvider";
import { estActif, filtreParPermission } from "@/components/dashboard/shell/menu";

// ─── Types ────────────────────────────────────────────────────────────────────

// Signature minimale d'une icône : typée explicitement (plutôt que
// React.ElementType) pour que les props `size`/`className`/`style` soient
// vérifiables — React.ElementType fait retomber l'inférence sur `never`.
type IconeComposant = React.ComponentType<{
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}>;

interface NavItem {
  href: string;
  label: string;
  Icon: IconeComposant;
  /** Pastille animée : signal "à traiter" (commandes, messages...). */
  badge?: boolean;
  /** Correspondance stricte sur le pathname (pas de startsWith). */
  exact?: boolean;
  /** Route préfixée par celle-ci mais rattachée à un autre lien (ex: produits/digital). */
  excludePrefix?: string[]; // sous-pages qui ont leur propre entrée
  /** Palier minimum requis — sinon l'item est cadenassé et ouvre l'upsell. */
  requiresPalier?: Palier;
  /** Message affiché dans l'overlay abonnement quand l'item est cadenassé. */
  messageVerrou?: string;
  /** Ouvre l'overlay abonnement au lieu de naviguer. */
  opensAbonnement?: boolean;
  /** Module de permissions : l'item disparaît entièrement si le niveau est "aucun". */
  moduleKey?: ModuleKey;
  /** Sous-titre affiché au-dessus du premier lien de chaque section d'un groupe long. */
  section?: string;
  /** Caisse en mode « simple » (ReglagesPos.mode) : seuls les liens essentiels du groupe restent affichés. */
  essentiel?: boolean;
}

/** Groupe repliable — son en-tête déplie/replie ses liens. */
interface NavGroupe {
  id: string;
  label: string;
  Icon: IconeComposant;
  items: NavItem[];
}

export interface SidebarProps {
  boutiqueNom?: string;
  boutiqueSlug?: string;
  boutiqueUrl?: string; // adresse publique (urlBoutique)
  nomCompte?: string;
  palier?: Palier;
  /** undefined = propriétaire : aucun filtrage n'est appliqué. */
  permissions?: Record<ModuleKey, Niveau>;
  /** Mode de la caisse (ReglagesPos.mode). "simple" (défaut) masque les outils avancés du groupe « Caisse & magasin ». */
  modePos?: "simple" | "pro";
  /** Parcours de démarrage (lib/demarrage.ts) : étapes restantes et hrefs des entrées dont l'étape manque. */
  demarrage?: { restantes: number; hrefs: string[] } | null;
}

// ─── Filtrage par permissions et état actif ──────────────────────────────────
// Logique partagée avec le nouveau shell (components/dashboard/shell/menu.ts) : une seule source.
export { estActif };

// ─── Navigation ───────────────────────────────────────────────────────────────

/** Raccourcis hors groupe — toujours visibles, en tête de sidebar. */
const PRIMAIRES: NavItem[] = [
  // « Accueil » : parcours de démarrage (l'URL reste /dashboard/demarrer). L'assistante vit dans le panneau de droite.
  { href: "/dashboard/demarrer", label: "Accueil", Icon: Rocket, exact: true, moduleKey: "boutique" },
  { href: "/dashboard/accueil", label: "Tableau de bord", Icon: Home,     exact: true },
  // Hub du module Boutique (profil, médias, SEO, réseaux, livraison,
  // multi-boutique) — remplace l'ancienne sous-sidebar dédiée.
  { href: "/dashboard/boutique", label: "Ma boutique", Icon: Store, exact: true, moduleKey: "boutique" },
  // Point d'entrée unique de l'argent du marchand (solde, séquestre, retraits) ; l'ancienne page Paiements y redirige.
  { href: "/dashboard/wallet", label: "Mon argent", Icon: Wallet, moduleKey: "finance" },
];

const GROUPES: NavGroupe[] = [
  {
    id: "ventes", label: "Ventes", Icon: ShoppingCart,
    items: [
      { href: "/dashboard/commandes", label: "Commandes", Icon: ShoppingCart, badge: true, moduleKey: "commandes" },
      { href: "/dashboard/factures",  label: "Factures",  Icon: FileText,                 moduleKey: "finance"   },
      { href: "/dashboard/retours",   label: "Retours",   Icon: RotateCcw,                moduleKey: "commandes" },
      { href: "/dashboard/boutique?section=livraison", label: "Livraison", Icon: Truck, moduleKey: "boutique" },
    ],
  },
  {
    // AXSO POS 2.0 — toutes les pages de la caisse et du magasin (lib/pos/).
    // `essentiel` : ce qui reste en mode « simple » (petite boutique : vendre,
    // voir son stock, tenir sa caisse, régler) ; le mode « pro » affiche tout.
    // Les quatre pages qui existaient avant le POS 2.0 (traçabilité,
    // comptabilité, charges, encaissements COD) restent visibles dans les deux modes.
    id: "pos", label: "Caisse & magasin", Icon: Monitor,
    items: [
      { href: "/dashboard/pos/caisse",       label: "Caisse",              Icon: Monitor,      moduleKey: "pos", section: "Vente", essentiel: true },
      { href: "/dashboard/pos/session",      label: "Session de caisse",   Icon: Wallet,       moduleKey: "pos", section: "Vente", essentiel: true },
      { href: "/dashboard/pos/retours",      label: "Retours & avoirs",    Icon: RotateCcw,    moduleKey: "pos", section: "Vente" },
      { href: "/dashboard/pos/pilotage",     label: "Pilotage en direct",  Icon: BarChart3,    moduleKey: "pos", section: "Vente" },
      { href: "/dashboard/pos/supervision",  label: "Supervision des caisses", Icon: Monitor,  moduleKey: "pos", section: "Vente" },

      { href: "/dashboard/pos/stock",        label: "Gestion des stocks",  Icon: Boxes,        moduleKey: "pos", section: "Stock", essentiel: true },
      { href: "/dashboard/pos/fiche",        label: "Fiche produit",       Icon: Search,       moduleKey: "pos", section: "Stock" },
      { href: "/dashboard/pos/inventaire",   label: "Inventaires",         Icon: Boxes,        moduleKey: "pos", section: "Stock" },
      { href: "/dashboard/pos/transferts",   label: "Transferts de stock", Icon: Truck,        moduleKey: "pos", section: "Stock" },
      { href: "/dashboard/pos/tracabilite",  label: "Traçabilité",         Icon: Package,      moduleKey: "pos", section: "Stock", essentiel: true },

      { href: "/dashboard/pos/achats",       label: "Achats & réassort",   Icon: ShoppingCart, moduleKey: "pos", section: "Achats" },
      { href: "/dashboard/pos/receptions",   label: "Réceptions",          Icon: Download,     moduleKey: "pos", section: "Achats" },
      { href: "/dashboard/pos/import",       label: "Import / export",     Icon: FileText,     moduleKey: "pos", section: "Achats" },

      { href: "/dashboard/pos/promotions",   label: "Promotions",          Icon: Tags,         moduleKey: "pos", section: "Clients en magasin" },
      { href: "/dashboard/pos/fidelite",     label: "Fidélité",            Icon: Star,         moduleKey: "pos", section: "Clients en magasin" },
      { href: "/dashboard/pos/credit",       label: "Crédit clients",      Icon: CreditCard,   moduleKey: "pos", section: "Clients en magasin" },

      // Outils financiers de la caisse, pilotés par la permission "finance" : un
      // caissier pur (pos:ecriture, finance:aucun) voit la caisse mais pas la comptabilité.
      { href: "/dashboard/pos/rapprochement", label: "Rapprochement des paiements", Icon: Calculator, moduleKey: "finance", section: "Finance du magasin" },
      { href: "/dashboard/pos/comptabilite", label: "Comptabilité",        Icon: Calculator,   moduleKey: "finance", section: "Finance du magasin", essentiel: true },
      { href: "/dashboard/pos/charges",      label: "Charges d'exploitation", Icon: Receipt,   moduleKey: "finance", section: "Finance du magasin", essentiel: true },
      { href: "/dashboard/logistique/encaissements", label: "Encaissements COD", Icon: Wallet, moduleKey: "finance", section: "Finance du magasin", essentiel: true },

      { href: "/dashboard/pos/analytics",    label: "Analytics magasin",   Icon: FileBarChart, moduleKey: "pos", section: "Suivi" },
      { href: "/dashboard/pos/journal",      label: "Journal d'activité",  Icon: FileText,     moduleKey: "pos", section: "Suivi" },
      { href: "/dashboard/pos/audit",        label: "Journal d'audit",     Icon: Lock,         moduleKey: "pos", section: "Suivi" },

      { href: "/dashboard/pos/demarrage",    label: "Mise en route",       Icon: Target,       moduleKey: "pos", section: "Configuration" },
      { href: "/dashboard/pos/reglages",     label: "Réglages de la caisse", Icon: Settings2,  moduleKey: "pos", section: "Configuration", essentiel: true },
    ],
  },
  {
    id: "clients", label: "Clients", Icon: Users,
    items: [
      { href: "/dashboard/clients",  label: "Clients",      Icon: Users,         moduleKey: "clients" },
      { href: "/dashboard/avis",     label: "Avis clients", Icon: Star,          moduleKey: "clients" },
      { href: "/dashboard/whatsapp", label: "WhatsApp",     Icon: MessageSquare, badge: true, moduleKey: "clients" },
      { href: "/dashboard/livreurs", label: "Livreurs",     Icon: Truck,         moduleKey: "commandes" },
    ],
  },
  {
    id: "catalogue", label: "Catalogue", Icon: Package,
    items: [
      { href: "/dashboard/produits",         label: "Produits",          Icon: Package,  excludePrefix: ["/dashboard/produits/digital", "/dashboard/produits/categories"], moduleKey: "produits" },
      { href: "/dashboard/produits/digital", label: "Produits Digitaux", Icon: Download, moduleKey: "produits" },
      { href: "/dashboard/produits/categories", label: "Catégories",     Icon: Tags,     moduleKey: "produits" },
      { href: "/dashboard/entrepots",        label: "Entrepôts",         Icon: Box,      moduleKey: "produits" },
    ],
  },
  {
    // AXSO Sourcing : une seule interface, l'assistant (lib/sourcing/assistant.ts). Fournisseurs et
    // réglages s'ouvrent depuis cette page ; ils n'ont pas d'entrée de menu.
    id: "sourcing", label: "AXSO Sourcing", Icon: Map,
    items: [
      { href: "/dashboard/sourcing", label: "Assistant Sourcing", Icon: Map, requiresPalier: "palier2", moduleKey: "produits" },
    ],
  },
  {
    id: "boutique", label: "Boutique", Icon: LayoutGrid,
    items: [
      { href: "/dashboard/themes",        label: "Thèmes",        Icon: LayoutGrid, moduleKey: "boutique" },
      { href: "/dashboard/builder",       label: "Constructeur",  Icon: Sparkles,   moduleKey: "boutique" },
      { href: "/dashboard/boutique/politiques", label: "Politiques", Icon: FileText, moduleKey: "boutique" },
      { href: "/dashboard/fichiers",      label: "Fichiers",      Icon: FolderOpen, moduleKey: "boutique" },
      { href: "/dashboard/transporteurs", label: "Transporteurs", Icon: Truck,      moduleKey: "commandes" },
      { href: "/dashboard/connecteurs",   label: "Connecteurs",   Icon: Plug,       moduleKey: "boutique" },
      { href: "/dashboard/controle-ia",   label: "Contrôle IA",   Icon: Sparkles,   requiresPalier: "palier1" },
      { href: "/dashboard/feeds",         label: "Flux produits", Icon: Link2,      moduleKey: "boutique" },
      { href: "/dashboard/campagnes",     label: "Campagnes",     Icon: Bell,       moduleKey: "marketing" },
    ],
  },
  {
    id: "croissance", label: "Croissance", Icon: BarChart3,
    items: [
      { href: "/dashboard/analytics",   label: "Analytics",   Icon: BarChart3,    moduleKey: "produits"  },
      { href: "/dashboard/objectifs",   label: "Objectifs",   Icon: Target,       moduleKey: "produits"  },
      { href: "/dashboard/rapports",    label: "Rapports",    Icon: FileBarChart, moduleKey: "produits"  },
      { href: "/dashboard/marketing",   label: "Marketing",   Icon: Megaphone,    requiresPalier: "palier1", moduleKey: "marketing" },
      { href: "/dashboard/affiliation", label: "Affiliation", Icon: UserCheck,    moduleKey: "marketing" },
      // Analyse des ventes ; l'argent lui-même (solde, retraits) est dans « Mon argent ».
      { href: "/dashboard/revenus",     label: "Revenus",     Icon: DollarSign,   moduleKey: "finance"   },
    ],
  },
  {
    id: "compte", label: "Compte", Icon: Settings2,
    items: [
      { href: "/dashboard/parametres", label: "Réglages",   Icon: Settings2,  moduleKey: "parametres" },
      { href: "/dashboard/abonnement", label: "Abonnement", Icon: CreditCard, opensAbonnement: true, moduleKey: "finance" },
    ],
  },
];

/** Groupes du menu pour cette session : mêmes droits et même mode caisse partout (barre latérale, tiroir mobile). */
export function groupesVisibles(permissions: Record<ModuleKey, Niveau> | undefined, modePos: "simple" | "pro", pathname: string, searchParams: URLSearchParams) {
  return GROUPES
    .map(g => ({ ...g, items: filtreParPermission(g.items, permissions) }))
    .map(g => (g.id === "pos" && modePos === "simple"
      ? { ...g, items: g.items.filter(it => it.essentiel || estActif(it, pathname, searchParams)) }
      : g))
    .filter(g => g.items.length > 0);
}

/** Raccourcis de premier niveau (Accueil, Tableau de bord, Ma boutique, Mon argent) filtrés par droits. */
export const primairesVisibles = (permissions?: Record<ModuleKey, Niveau>) => filtreParPermission(PRIMAIRES, permissions);

/** Pages proposées par la recherche du tableau de bord (Ctrl+K), filtrées comme le menu. */
export function pagesDashboard(permissions?: Record<ModuleKey, Niveau>) {
  return [
    ...filtreParPermission(PRIMAIRES, permissions).map((it) => ({ ...it, groupe: "" })),
    ...GROUPES.flatMap((g) => filtreParPermission(g.items, permissions).map((it) => ({ ...it, groupe: g.label }))),
  ];
}

// ─── Pastille « à compléter » (parcours de démarrage, B10) ────────────────────

function Pastille({ valeur }: { valeur?: number | boolean }) {
  const t = useT();
  if (!valeur) return null;
  return typeof valeur === "number"
    ? <span aria-label={t("{0} étapes restantes", valeur)} className="min-w-[18px] h-[18px] px-1 rounded-full flex-shrink-0 flex items-center justify-center text-[10.5px] font-bold leading-none text-white bg-[#F97316]">{valeur}</span>
    : <span role="img" aria-label={t("À compléter")} title={t("À compléter")} className="w-2 h-2 rounded-full flex-shrink-0 bg-[#F97316]" />;
}

// ─── Lien de premier niveau (raccourci hors groupe) ───────────────────────────

function LienPrincipal({
  item, pathname, searchParams, palier, pastille, compact, accent = "#F5A623", activeBg = "#FFF7ED", activeText = "#92400E",
}: {
  item: NavItem;
  /** Barre repliée : icône seule, pastilles posées sur l'icône. */
  compact?: boolean;
  pastille?: number | boolean;
  pathname: string;
  searchParams: URLSearchParams;
  palier?: Palier;
  accent?: string;
  activeBg?: string;
  activeText?: string;
}) {
  const t = useT();
  const { openAbonnement } = useAbonnementOverlay();
  const active = estActif(item, pathname, searchParams);
  const locked = !!item.requiresPalier && !palierAuMoins(palier ?? "palier0", item.requiresPalier);

  const contenu = (
    <>
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
          style={{ backgroundColor: accent }}
        />
      )}
      <span
        className="relative flex-shrink-0 flex items-center justify-center w-[30px] h-[30px] rounded-lg transition-all"
        style={active
          ? { backgroundColor: `${accent}22`, color: accent }
          : { backgroundColor: "#F5F5F5", color: locked ? "#D1D5DB" : "#9CA3AF" }}
      >
        <item.Icon size={16} />
        {compact && (locked
          ? <Lock size={10} className="absolute -bottom-0.5 -right-0.5 text-gray-400" />
          : (pastille || item.badge) && (
            <span className="absolute -top-1.5 -right-1.5 flex">
              {pastille ? <Pastille valeur={pastille} /> : <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accent }} />}
            </span>
          ))}
      </span>
      <span className={cn(
        "flex-1 truncate leading-none font-medium",
        compact && "sr-only",
        locked ? "text-gray-400" : active ? "font-semibold text-[#111111]" : "text-gray-600 group-hover:text-[#111111]",
      )}>
        {t(item.label)}
      </span>
      {!compact && locked && <Lock size={12} className="flex-shrink-0 text-gray-300" />}
      {!compact && !locked && <Pastille valeur={pastille} />}
      {!compact && !locked && item.badge && (
        <span className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ backgroundColor: accent }} />
      )}
    </>
  );

  // Icône à 36 px du bord dans les deux modes (marge de la nav + 9 px) : rien ne bouge quand la barre se déplie.
  const className = cn(
    "relative flex items-center gap-3 pl-[9px] py-2.5 rounded-xl text-[13.5px] font-medium whitespace-nowrap transition-all duration-150 group",
    compact ? "pr-[9px]" : "pr-3.5",
    !active && !locked && "hover:bg-[#FFF7ED]",
    locked && "cursor-pointer hover:bg-[#FFF7ED]/60",
  );

  if (locked) {
    return (
      <button type="button" onClick={() => openAbonnement(item.requiresPalier, item.messageVerrou)} className={cn(className, "w-full text-left")}>
        {t(contenu)}
      </button>
    );
  }
  if (item.opensAbonnement) {
    return (
      <button type="button" onClick={() => openAbonnement()} className={cn(className, "w-full text-left")}
        style={active ? { backgroundColor: activeBg, color: activeText } : undefined}>
        {t(contenu)}
      </button>
    );
  }
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={className} style={active ? { backgroundColor: activeBg, color: activeText } : undefined}>
      {t(contenu)}
    </Link>
  );
}

// ─── Lien enfant (à l'intérieur d'un groupe déplié) ───────────────────────────

function LienEnfant({
  item, pathname, searchParams, palier, pastille, accent = "#F5A623", activeBg = "#FFF7ED", activeText = "#92400E",
}: {
  item: NavItem;
  pastille?: number | boolean;
  pathname: string;
  searchParams: URLSearchParams;
  palier?: Palier;
  accent?: string;
  activeBg?: string;
  activeText?: string;
}) {
  const t = useT();
  const { openAbonnement } = useAbonnementOverlay();
  const active = estActif(item, pathname, searchParams);
  const locked = !!item.requiresPalier && !palierAuMoins(palier ?? "palier0", item.requiresPalier);

  const contenu = (
    <>
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors"
        style={{ backgroundColor: active ? accent : locked ? "#E8E8E8" : "#D8D8D8" }}
      />
      <span className={cn(
        "flex-1 truncate leading-none",
        locked ? "text-gray-400" : active ? "font-semibold text-[#111111]" : "text-gray-500 group-hover:text-[#111111]",
      )}>
        {t(item.label)}
      </span>
      {locked && <Lock size={11} className="flex-shrink-0 text-gray-300" />}
      {!locked && <Pastille valeur={pastille} />}
      {!locked && item.badge && (
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse" style={{ backgroundColor: accent }} />
      )}
    </>
  );

  const className = cn(
    "relative flex items-center gap-2.5 w-full pl-3 pr-3 py-2 rounded-lg text-[13px] transition-all duration-150 group",
    !active && !locked && "hover:bg-[#FFF7ED]",
    locked && "cursor-pointer hover:bg-[#FFF7ED]/60",
  );

  if (locked) {
    return (
      <button type="button" onClick={() => openAbonnement(item.requiresPalier, item.messageVerrou)} className={cn(className, "text-left")}>
        {t(contenu)}
      </button>
    );
  }
  if (item.opensAbonnement) {
    return (
      <button type="button" onClick={() => openAbonnement()} className={cn(className, "text-left")}
        style={active ? { backgroundColor: activeBg, color: activeText } : undefined}>
        {t(contenu)}
      </button>
    );
  }
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={className} style={active ? { backgroundColor: activeBg, color: activeText } : undefined}>
      {t(contenu)}
    </Link>
  );
}

// ─── Groupe repliable ─────────────────────────────────────────────────────────

function GroupeRepliable({
  groupe, pathname, searchParams, palier, ouvert, onToggle, pastille, compact,
}: {
  groupe: NavGroupe;
  /** Barre repliée : icône du groupe seule, sans ses liens. */
  compact?: boolean;
  pastille: (item: NavItem) => number | boolean;
  pathname: string;
  searchParams: URLSearchParams;
  palier?: Palier;
  ouvert: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  const Icon = groupe.Icon;
  const contientActif = groupe.items.some(it => estActif(it, pathname, searchParams));
  // Replié, le groupe signale quand même une activité à traiter.
  const badgeMasque = (compact || !ouvert) && groupe.items.some(it => it.badge);
  const pastilleMasquee = (compact || !ouvert) && groupe.items.some(it => pastille(it));
  const signal = pastilleMasquee
    ? <Pastille valeur />
    : badgeMasque && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse" style={{ backgroundColor: "#F5A623" }} />;

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!compact && ouvert}
        className={cn(
          "w-full flex items-center gap-2.5 pl-[9px] py-2.5 rounded-xl whitespace-nowrap transition-all duration-150",
          compact ? "pr-[9px]" : "pr-3.5",
          !contientActif && "text-[#999999] hover:bg-[#FFF7ED] hover:text-[#111111]",
        )}
        style={contientActif ? { color: "#D4911A" } : undefined}
      >
        <span className={cn("relative flex-shrink-0 flex items-center justify-center w-[30px] h-[22px] rounded-lg", compact && contientActif && "bg-primaire-fond")}>
          <Icon size={compact ? 16 : 14} />
          {compact && signal && <span className="absolute -top-1.5 -right-1.5 flex">{signal}</span>}
        </span>
        <span className={cn("flex-1 text-left text-[11.5px] font-bold uppercase tracking-[0.1em] truncate", compact && "sr-only")}>
          {t(groupe.label)}
        </span>
        {!compact && signal}
        {!compact && (
          <ChevronDown
            size={13}
            className={cn("flex-shrink-0 transition-transform duration-200", ouvert && "rotate-180")}
          />
        )}
      </button>

      {ouvert && !compact && (
        <div className="ml-[19px] pl-2.5 border-l border-[#F0F0F0] mt-0.5 mb-1 space-y-0.5">
          {groupe.items.map((item, i) => (
            <div key={item.href}>
              {/* Sous-titre de section : au premier lien de chaque section d'un groupe long. */}
              {item.section && item.section !== groupe.items[i - 1]?.section && (
                <div className={cn("pl-3 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#BBBBBB]", i > 0 ? "pt-2.5" : "pt-1")}>
                  {t(item.section)}
                </div>
              )}
              <LienEnfant
                item={item}
                pathname={pathname}
                searchParams={searchParams}
                palier={palier}
                pastille={pastille(item)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const LARGEUR = 252;
const LARGEUR_REPLIEE = 72;
const CLE_REPLIE = "sidebar_repliee";

export function Sidebar({ boutiqueNom, boutiqueSlug, boutiqueUrl, nomCompte = "", palier, permissions, modePos = "simple", demarrage }: SidebarProps) {
  const t = useT();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Barre repliable (icônes seules), choix mémorisé. Repliée, elle se déplie par-dessus le contenu
  // au survol ou quand le clavier y entre, et se replie à la sortie : la page ne bouge pas.
  const [repliee, setRepliee] = useState(false);
  const [anime, setAnime] = useState(false); // pas de transition au chargement de l'état mémorisé
  const [survol, setSurvol] = useState(false);
  const [focusDedans, setFocusDedans] = useState(false);
  useEffect(() => {
    try { setRepliee(localStorage.getItem(CLE_REPLIE) === "1"); } catch { /* stockage indisponible */ }
    const id = requestAnimationFrame(() => setAnime(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const basculerRepli = () => {
    const v = !repliee;
    setRepliee(v);
    setSurvol(false); // la souris est sur le bouton : on replie tout de suite, sans attendre qu'elle sorte
    try { localStorage.setItem(CLE_REPLIE, v ? "1" : "0"); } catch { /* stockage indisponible */ }
  };
  const etendue = !repliee || survol || focusDedans;
  const compact = !etendue;

  // Groupes visibles pour cette session (les items sans accès sont retirés,
  // et un groupe entièrement vidé par le filtrage disparaît avec eux).
  // Caisse en mode « simple » : le groupe ne garde que ses liens essentiels —
  // plus la page en cours, pour qu'un lien direct vers un outil avancé reste repéré.
  const tousGroupes = groupesVisibles(permissions, modePos, pathname, searchParams);

  // Champ « Rechercher… » : filtre en direct les entrées visibles (lib/recherche-dashboard.ts :
  // sans accents, synonymes, petites fautes) ; les groupes qui ont un résultat s'ouvrent d'office.
  const [q, setQ] = useState("");
  const enRecherche = !!q.trim();
  const trouves = new Set(enRecherche
    ? chercher([...PRIMAIRES, ...tousGroupes.flatMap(g => g.items.map(it => ({ ...it, groupe: g.label })))], q,
        (it: NavItem & { groupe?: string }) => textesPage(it, t)).map(it => it.href)
    : []);
  const primaires = filtreParPermission(PRIMAIRES, permissions).filter(it => !enRecherche || trouves.has(it.href));
  const groupes = enRecherche
    ? tousGroupes.map(g => ({ ...g, items: g.items.filter(it => trouves.has(it.href)) })).filter(g => g.items.length > 0)
    : tousGroupes;

  // Pastilles du parcours de démarrage : nombre d'étapes sur « Accueil », point sur les entrées à compléter.
  const pastille = (it: NavItem): number | boolean =>
    it.href === "/dashboard/demarrer" ? demarrage?.restantes ?? 0 : !!demarrage?.hrefs.includes(it.href);

  // Groupe qui contient la route courante.
  const idActif = groupes
    .find(g => g.items.some(it => estActif(it, pathname, searchParams)))?.id;

  // Choix explicite de l'utilisateur, par groupe. Tant qu'il n'a rien touché,
  // le groupe suit la route (l'actif est déplié, les autres repliés) ; dès
  // qu'il replie ou déplie un groupe à la main, son choix prime et n'est plus
  // écrasé par la navigation. État purement dérivé : aucun effet, donc aucun
  // risque de re-déplier un groupe que l'utilisateur vient de fermer.
  const [choix, setChoix] = useState<Record<string, boolean>>({});
  const estOuvert = (id: string) => enRecherche || (choix[id] ?? (id === idActif));
  const toggle = (id: string) => setChoix(prev => ({ ...prev, [id]: !(prev[id] ?? (id === idActif)) }));

  const transition = anime ? "transition-[width,box-shadow] duration-200 ease-out" : "";

  return (
    // Emplacement réservé dans la mise en page : seule l'épingle (bouton) le fait changer de largeur.
    <div className={cn("relative flex-shrink-0 h-screen", transition)} style={{ width: repliee ? LARGEUR_REPLIEE : LARGEUR }}>
    <aside
      aria-label={t("Menu principal")}
      onMouseEnter={() => repliee && setSurvol(true)}
      onMouseLeave={(e) => {
        // Liste déroulante native ouverte (choix de boutique) : sa fenêtre sort de la barre, on la garde ouverte.
        const actif = document.activeElement;
        if (actif?.tagName === "SELECT" && e.currentTarget.contains(actif)) return;
        setSurvol(false);
      }}
      // Le clavier déplie la barre ; un clic de souris sur un lien, non (sinon elle resterait ouverte après la navigation).
      onFocus={(e) => { const c = e.target; if (c.matches(":focus-visible") || c.tagName === "INPUT" || c.tagName === "SELECT") setFocusDedans(true); }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) { setFocusDedans(false); if (repliee) setQ(""); } }}
      className={cn(
        "absolute inset-y-0 left-0 z-50 flex flex-col overflow-hidden bg-carte border-r border-bordure",
        transition,
        repliee && etendue && "shadow-flottante",
      )}
      style={{
        width: etendue ? LARGEUR : LARGEUR_REPLIEE,
        fontFamily: "'Poppins','Century Gothic',system-ui,sans-serif",
      }}
    >
      {/* En-tête : logo (monogramme quand la barre est repliée) + épingle. Même hauteur que la barre du haut. */}
      <div className="h-14 flex items-center gap-2 pl-[22px] pr-2 flex-shrink-0 border-b border-bordure">
        <Link href="/dashboard/accueil" aria-label={t("Axso — revenir au tableau de bord")} className="flex-shrink-0 flex items-center gap-2 whitespace-nowrap">
          <img src="/icon-192.png" alt="" className="w-7 h-7 rounded-[6px] flex-shrink-0" />
          {!compact && <span className="text-[14px] font-[650] tracking-wide text-encre">AXSO</span>}
        </Link>
        {etendue && (
          <button type="button" onClick={basculerRepli} aria-pressed={!repliee}
            aria-label={repliee ? t("Garder le menu ouvert") : t("Replier le menu")} title={repliee ? t("Garder le menu ouvert") : t("Replier le menu")}
            className="ml-auto w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-controle text-doux hover:bg-carte-2 hover:text-encre transition-colors">
            {repliee ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        )}
      </div>

      {/* Navigation — raccourcis puis groupes repliables */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: "none" }}>
        {/* Repliée : seule la loupe se voit ; un clic (ou Tab) met le focus dans le champ, ce qui déplie la barre. */}
        <label className="flex items-center gap-2 h-9 pl-[17px] pr-3 mb-2 rounded-xl bg-[#F5F5F5] border border-transparent focus-within:bg-white focus-within:border-[#F5A623] transition-colors cursor-text"
          title={compact ? t("Rechercher dans le menu") : undefined}>
          <Search size={14} className="text-[#999999] flex-shrink-0" />
          <input type="search" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === "Escape") setQ(""); }}
            placeholder={t("Rechercher…")} aria-label={t("Rechercher dans le menu")} autoComplete="off"
            className={cn("flex-1 min-w-0 bg-transparent outline-none text-[13px] text-[#111111] placeholder:text-[#AAAAAA]", compact && "sr-only")} />
        </label>

        {enRecherche && !compact && !primaires.length && !groupes.length && (
          <p className="px-3 py-3 text-center text-[12.5px] text-[#888888]">{t("Aucun résultat pour « {0} »", q.trim())}</p>
        )}

        <div className="space-y-0.5 mb-1.5">
          {primaires.map(item => (
            <LienPrincipal
              key={item.href}
              item={item}
              pathname={pathname}
              searchParams={searchParams}
              palier={palier}
              pastille={pastille(item)}
              compact={compact}
            />
          ))}
        </div>

        <div className="space-y-0.5">
          {groupes.map(groupe => (
            <GroupeRepliable
              key={groupe.id}
              groupe={groupe}
              pathname={pathname}
              searchParams={searchParams}
              palier={palier}
              ouvert={estOuvert(groupe.id)}
              onToggle={() => toggle(groupe.id)}
              pastille={pastille}
              compact={compact}
            />
          ))}
        </div>

        {enRecherche && !compact && (
          // Ouvre la recherche globale (RechercheDashboard, en-tête) avec la même requête.
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("recherche:ouvrir", { detail: q.trim() }))}
            className="w-full mt-2 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-left text-[12.5px] text-[#555555] hover:bg-[#FFF7ED]">
            <Search size={13} className="flex-shrink-0 text-[#F5A623]" />
            <span className="truncate">{t("Chercher « {0} » partout", q.trim())}</span>
          </button>
        )}
      </nav>

      {/* Pied — vitrine + compte */}
      <div className="flex-shrink-0 px-3 py-3 space-y-2 border-t border-bordure">
        <div className={compact ? "hidden" : undefined}><BoutiqueSwitcher /></div>
        {boutiqueSlug && (
          <a
            href={boutiqueUrl ?? `/${boutiqueSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={compact ? t(boutiqueNom) || t("Voir ma boutique") : undefined}
            className={cn("flex items-center gap-3 py-2.5 rounded-xl active:scale-[0.98] transition-all group whitespace-nowrap", compact ? "justify-center px-0" : "px-3.5")}
            style={{
              background: "linear-gradient(135deg,#111111,#333333)",
              boxShadow: "0 2px 12px rgba(17,17,17,0.22)",
            }}
          >
            <ExternalLink size={14} className="text-white/80 flex-shrink-0" />
            {!compact && (
              <>
                <span className="text-[12.5px] font-bold text-white flex-1 truncate">
                  {t(boutiqueNom) || t("Voir ma boutique")}
                </span>
                <ChevronRight size={13} className="text-white/40 group-hover:text-white/80 transition-all group-hover:translate-x-0.5" />
              </>
            )}
          </a>
        )}

        <Link
          href="/dashboard/profil"
          aria-label={compact ? nomCompte || t("Mon compte") : undefined}
          className={cn(
            "flex items-center gap-3 py-2.5 rounded-xl transition-all group whitespace-nowrap",
            compact ? "justify-center px-0" : "px-3",
            pathname.startsWith("/dashboard/profil") ? "bg-[#FFF7ED]" : "hover:bg-[#FFF7ED]",
          )}
        >
          <AvatarCompte
            nom={nomCompte}
            className="w-9 h-9 flex-shrink-0 rounded-xl text-white text-[13px] font-bold"
            style={{
              background: "linear-gradient(135deg,#F5A623,#D4911A)",
              boxShadow: "0 2px 8px rgba(245,166,35,0.3)",
            }}
          />
          {!compact && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[#111111] leading-tight truncate">{nomCompte || t("Mon compte")}</div>
                <div className="text-[11px] text-[#999999] leading-none mt-1">{t("Profil et sécurité")}</div>
              </div>
              <Settings2 size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
            </>
          )}
        </Link>
      </div>
    </aside>
    </div>
  );
}
