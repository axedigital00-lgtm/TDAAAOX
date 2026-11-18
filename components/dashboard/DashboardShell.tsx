"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, ShoppingCart, Store, Users, Monitor } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { BoutiqueSwitcher } from "@/components/dashboard/BoutiqueSwitcher";
import { Header } from "@/components/dashboard/Header";
import { AvatarCompte } from "@/components/dashboard/AvatarCompte";
import { RechercheDashboard } from "@/components/dashboard/RechercheDashboard";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { QuotaBanner } from "@/components/dashboard/QuotaBanner";
import { CaisseKiosk } from "@/components/dashboard/CaisseKiosk";
import { ModuleTutorial } from "@/components/dashboard/ModuleTutorial";
import type { Palier } from "@/lib/plans";
import type { ModuleKey, Niveau } from "@/lib/permissions";
import { useT } from "@/components/I18nProvider";
import { CompteurPromoDashboard } from "@/components/promo/CompteurPromo";
import { AxiaPanneau } from "@/components/dashboard/AxiaPanneau";

const FULLBLEED_PREFIXES: string[] = ["/dashboard/builder", "/dashboard/themes"];

// Tour d'accueil combiné — UN SEUL tutoriel, affiché une seule fois à la
// toute première connexion sur une boutique donnée (clé localStorage
// scopée par tenantId), plutôt qu'un pop-up séparé à chaque nouveau module
// visité. Les tutoriels par module restent disponibles à la demande via
// leur bouton "?", mais ne s'auto-affichent plus jamais (voir ModuleTutorial.tsx).
const BIENVENUE_STEPS = [
  { Icon: Sparkles,      titre: "AXIA, ton assistant boutique", description: "AXIA vit dans le panneau à droite : ouvre-le avec le bouton AXIA en haut de l'écran (ou le bouton du milieu en bas sur téléphone). Pose-lui une question ou demande-lui d'agir : créer un produit, lancer une promo, relancer un client." },
  { Icon: ShoppingCart,  titre: "Commandes & Produits",          description: "Gère tes ventes et ton catalogue depuis la sidebar — chaque module a son propre bouton \"?\" pour revoir son mode d'emploi à tout moment." },
  { Icon: Store,         titre: "Ma boutique & Point de vente",  description: "Personnalise ta boutique en ligne, ou bascule vers le module Point de vente pour encaisser directement en magasin." },
  { Icon: Users,         titre: "Ton équipe",                     description: "Invite des collaborateurs (gérant, caissier, comptable...) avec des accès précis depuis Paramètres > Équipe." },
];

// Toute la logique dépendant de la route vit ici, dans un composant client,
// plutôt que dans le layout serveur : les layouts Next.js ne se ré-exécutent
// pas à chaque navigation entre pages soeurs (c'est voulu, pour ne pas
// re-render la sidebar à chaque clic) — une décision "faut-il afficher la
// sidebar" basée sur headers() côté serveur restait donc figée sur l'état du
// tout premier chargement. usePathname() côté client, lui, se met à jour de
// façon fiable à chaque navigation.
export function DashboardShell({
  children, session, boutique, quotaAtteint, palier, permissions, modeCaisse, modePos, promo, demarrage,
}: {
  children: React.ReactNode;
  /** Promo de lancement en cours (lib/promo.ts) : compteur en haut de chaque page. */
  promo?: { finLe: string; maintenant: number } | null;
  session: any;
  boutique: { slug: string; nomBoutique: string; url?: string } | null;
  quotaAtteint: boolean;
  palier: Palier;
  permissions?: Record<ModuleKey, Niveau>;
  // Calculé une fois côté serveur dans layout.tsx (estCaissierPur), PAS
  // re-dérivé du pathname côté client : contrairement à fullBleed ci-dessous,
  // ce mode dépend du RÔLE de l'utilisateur, pas de la route visitée — un
  // caissier pur doit voir le kiosque plein écran sur n'importe quelle route
  // du dashboard, pas seulement /dashboard/logistique?tab=pos.
  modeCaisse?: boolean;
  /** Mode de la caisse (ReglagesPos.mode), lu dans layout.tsx : "simple" allège le menu « Caisse & magasin ». */
  modePos?: "simple" | "pro";
  /** Parcours de démarrage, lu dans layout.tsx : pastilles du menu (étapes restantes, entrées à compléter). */
  demarrage?: { restantes: number; hrefs: string[] } | null;
}) {
  const t = useT();
  const pathname = usePathname();
  // Un seul nom pour tous les avatars (en-tête, menu mobile, barre latérale) : mêmes initiales partout.
  const nomCompte: string = session?.user?.name || session?.user?.email || "";
  const fullBleed = FULLBLEED_PREFIXES.some(r => pathname.startsWith(r));

  // Mode Caisse : un caissier pur n'a jamais accès au chrome du dashboard
  // (sidebar/header/bottom nav) — écran plein écran dédié à la place, sur
  // desktop comme sur mobile.
  if (modeCaisse) {
    return <CaisseKiosk boutiqueNom={boutique?.nomBoutique} />;
  }

  return (
    <>
      <ModuleTutorial
        moduleKey="bienvenue"
        storageKey={`bienvenue:${session?.user?.tenantId ?? "defaut"}`}
        autoOpen
        titre={t("Bienvenue sur AXSO")}
        sousTitre={t("Un tour rapide pour démarrer")}
        steps={BIENVENUE_STEPS}
      />

      {/* ─── Layout responsive UNIQUE ────────────────────────────────
          Auparavant : deux arborescences JSX sœurs complètes ("hidden
          md:flex" pour desktop, "md:hidden" pour mobile), chacune
          contenant sa propre copie de `children`. Tailwind ne fait que
          MASQUER visuellement (display:none) celle qui ne correspond pas
          au viewport — les DEUX restent montées en React en permanence,
          donc CHAQUE page du dashboard tournait en double : deux fetch
          initiaux, et pour le Constructeur (page la plus sensible, avec
          son auto-save débouncé) deux minuteries de sauvegarde
          indépendantes qui se chevauchaient et pouvaient s'écraser l'une
          l'autre — confirmé en observant deux `GET /api/tenants/moi-complet`
          et deux `PATCH /api/tenants` par chargement/édition dans les logs
          serveur. Ici, `children` n'est monté qu'UNE SEULE fois ; seuls les
          éléments de chrome sans état (Sidebar/Header vs MobileHeader/
          MobileBottomNav) sont togglés par CSS pur. */}
      {/* h-dvh (mobile) plutôt que min-h-screen/100vh : sur mobile, 100vh est
          calculé sur la hauteur de viewport barre d'adresse masquée — plus
          grand que ce qui est réellement visible au chargement. */}
      <div className="flex flex-col md:flex-row h-dvh md:h-screen bg-[#F5F5F5] text-gray-900 overflow-hidden" style={{ fontFamily: "'Poppins', 'Century Gothic', system-ui, sans-serif" }}>
        <div className="hidden md:block">
          <Sidebar boutiqueNom={boutique?.nomBoutique} boutiqueSlug={boutique?.slug} boutiqueUrl={boutique?.url} palier={palier} permissions={permissions} modePos={modePos} nomCompte={nomCompte} demarrage={demarrage} />
        </div>
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="md:hidden flex-shrink-0">
            <MobileHeader boutiqueNom={boutique?.nomBoutique} permissions={permissions} nom={nomCompte} />
          </div>
          {!fullBleed && (
            <div className="hidden md:block flex-shrink-0">
              <Header session={session} boutiqueSlug={boutique?.slug} boutiqueUrl={boutique?.url} boutiqueNom={boutique?.nomBoutique} permissions={permissions}/>
            </div>
          )}
          <main className={fullBleed ? "flex-1 overflow-hidden flex flex-col" : "flex-1 overflow-y-auto pb-32 md:pb-0"}>
            {fullBleed ? children : (
              <div key={pathname} className="ax-page-enter px-3 pt-3 md:px-6 md:pt-6 md:pb-8 max-w-lg md:max-w-7xl mx-auto w-full space-y-4 md:space-y-0">
                {promo && <CompteurPromoDashboard finLe={promo.finLe} maintenant={promo.maintenant} />}
                {quotaAtteint && !promo && <QuotaBanner />}
                {children}
              </div>
            )}
          </main>
          <div className="md:hidden flex-shrink-0">
            <MobileBottomNav permissions={permissions} modePos={modePos} demarrage={demarrage} />
          </div>
        </div>
        {/* AXIA : colonne de droite qui pousse le contenu (≥ lg), feuille plein écran en dessous.
            Monté une seule fois ici : la conversation suit le marchand d'une page à l'autre. */}
        <AxiaPanneau />
      </div>
    </>
  );
}

/* ─── Header mobile ────────────────────────────────────────────── */
function MobileHeader({ boutiqueNom, permissions, nom }: { boutiqueNom?: string; permissions?: Record<ModuleKey, Niveau>; nom: string }) {
  const t = useT();
  return (
    <header className="sticky top-0 z-40 bg-white/96 backdrop-blur-xl border-b border-gray-100"
      style={{ boxShadow: "0 1px 12px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center justify-between gap-2 px-4 h-14">
        {/* Même destination que le logo de l'en-tête ordinateur (voir Header.tsx). */}
        <Link href="/dashboard/accueil" aria-label={t("Axso — revenir au tableau de bord")} className="flex-shrink-0">
          <img src="/logo.png" alt="" style={{ height: "32px", width: "auto", objectFit: "contain" }}/>
        </Link>
        {boutiqueNom && (
          <div className="flex items-center gap-1.5 bg-[#F5A623]/8 border border-[#F5A623]/20 rounded-full px-3 py-1 min-w-0 max-w-[150px]">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0"/>
            <span className="text-xs font-semibold text-[#F5A623] truncate">{t(boutiqueNom)}</span>
          </div>
        )}
        <div className="flex items-center gap-2 flex-shrink-0">
        <RechercheDashboard permissions={permissions} mobile />
        {(!permissions || permissions.pos !== "aucun") && (
          <Link href="/dashboard/pos/caisse" aria-label={t("Caisse")} className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-[#111111] text-white active:scale-95 transition-transform">
            <Monitor size={17} />
          </Link>
        )}
        <Link href="/dashboard/profil" aria-label={t("Mon profil")} className="flex-shrink-0">
          <AvatarCompte nom={nom} className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F5A623] to-[#e8950f]" classeInitiales="text-white text-xs font-bold" />
        </Link>
        </div>
      </div>
      <div className="px-4 pb-2.5 empty:hidden"><BoutiqueSwitcher /></div>
    </header>
  );
}
