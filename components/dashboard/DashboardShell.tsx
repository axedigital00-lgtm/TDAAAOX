"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Sparkles, ShoppingCart, Store, Users } from "lucide-react";
import { Sidebar, initiales } from "@/components/dashboard/Sidebar";
import { QuotaBanner } from "@/components/dashboard/QuotaBanner";
import { CaisseKiosk } from "@/components/dashboard/CaisseKiosk";
import { ModuleTutorial } from "@/components/dashboard/ModuleTutorial";
import type { Palier } from "@/lib/plans";
import type { ModuleKey, Niveau } from "@/lib/permissions";
import { useT } from "@/components/I18nProvider";
import { NavigationInstantanee, lienInterne } from "@/components/dashboard/NavigationInstantanee";
import { CompteurPromoDashboard } from "@/components/promo/CompteurPromo";
import { MobileTopBar } from "@/components/dashboard/design-system/layout/MobileTopBar";
import { CommandPalette } from "@/components/dashboard/design-system/layout/CommandPalette";
import { AxiaDock } from "@/components/dashboard/design-system/layout/AxiaDock";
import { MobileRubriques, MobileTabBar } from "@/components/dashboard/design-system/layout/MobileTabBar";
import { VisitePage } from "@/components/dashboard/VisitePage";
import { SettingsSidebar, estRouteParametres, memoriserRetour } from "@/components/dashboard/design-system/layout/SettingsSidebar";

/** Écrans plein cadre : pas de conteneur de page ni de dock Stella. */
const FULLBLEED_PREFIXES: string[] = ["/dashboard/builder", "/dashboard/themes/creer"];
/** Pages sans dock Stella : l'accueil (champ Stella intégré, §8.1) et Stella plein écran. */
const SANS_DOCK = ["/dashboard", "/dashboard/accueil"];

// Tour d'accueil combiné — UN SEUL tutoriel, affiché une seule fois à la
// toute première connexion sur une boutique donnée (clé localStorage
// scopée par tenantId), plutôt qu'un pop-up séparé à chaque nouveau module
// visité. Les tutoriels par module restent disponibles à la demande via
// leur bouton "?", mais ne s'auto-affichent plus jamais (voir ModuleTutorial.tsx).
const BIENVENUE_STEPS = [
  { Icon: Sparkles,      titre: "Stella, ton assistant boutique", description: "Pose-lui n'importe quelle question ou demande-lui d'agir directement : créer un produit, lancer une promo, relancer un client." },
  { Icon: ShoppingCart,  titre: "Commandes & Produits",          description: "Gère tes ventes et ton catalogue depuis la barre latérale — chaque module a son propre bouton \"?\" pour revoir son mode d'emploi à tout moment." },
  { Icon: Store,         titre: "Ma boutique & Point de vente",  description: "Personnalise ta boutique en ligne, ou ouvre l'application Caisse & magasin pour encaisser directement en magasin." },
  { Icon: Users,         titre: "Ton équipe",                     description: "Invite des collaborateurs (gérant, caissier, comptable...) avec des accès précis depuis Paramètres > Équipe." },
];

// Toute la logique dépendant de la route vit ici, dans un composant client,
// plutôt que dans le layout serveur : les layouts Next.js ne se ré-exécutent
// pas à chaque navigation entre pages soeurs — usePathname() côté client, lui,
// se met à jour de façon fiable à chaque navigation.
//
// Structure (MASTERPROMPT §5.1, §13.3) : cadre noir, sidebar de 240px, zone
// principale blanche arrondie qui porte seule le défilement. En mobile, barre
// noire collante + sidebar en tiroir. `children` n'est monté qu'une seule fois
// (le constructeur a une sauvegarde automatique qui ne doit pas tourner en double).
export function DashboardShell({
  children, session, boutique, quotaAtteint, palier, permissions, modeCaisse, modePos, promo, commandesATraiter = 0,
}: {
  children: React.ReactNode;
  /** Promo de lancement en cours (lib/promo.ts) : compteur en haut de chaque page. */
  promo?: { finLe: string; maintenant: number } | null;
  session: any;
  boutique: { slug: string; nomBoutique: string; url?: string } | null;
  quotaAtteint: boolean;
  palier: Palier;
  permissions?: Record<ModuleKey, Niveau>;
  // Calculé côté serveur (estCaissierPur) : un caissier pur voit le kiosque plein écran sur toute route.
  modeCaisse?: boolean;
  /** Mode de la caisse (ReglagesPos.mode), lu dans layout.tsx : "simple" allège l'application Caisse. */
  modePos?: "simple" | "pro";
  /** Commandes à traiter, pour le compteur de la sidebar. */
  commandesATraiter?: number;
}) {
  const t = useT();
  const pathname = usePathname();
  const [navOuverte, setNavOuverte] = useState(false);
  // Barre latérale réduite en rail par défaut ; elle s'ouvre au survol par-dessus le
  // contenu (sans le décaler). Épinglée, elle reste ouverte sauf quand le panneau Stella
  // a besoin de la place (écran de moins de 1500 px).
  const [epinglee, setEpinglee] = useState(false);
  const [axiaOuvert, setAxiaOuvert] = useState(false);
  const [large, setLarge] = useState(true);
  const toucher = useRef<number | null>(null);

  const estAccueilAxia = pathname === "/dashboard";
  const fullBleed = estAccueilAxia || FULLBLEED_PREFIXES.some((r) => pathname.startsWith(r));
  const dock = !fullBleed && !SANS_DOCK.includes(pathname);
  // Barre d'onglets mobile sur toutes les pages, Stella comprise ; le Constructeur a la sienne.
  const avecOnglets = !pathname.startsWith("/dashboard/builder");
  const parametres = estRouteParametres(pathname);

  useEffect(() => {
    try { setEpinglee(localStorage.getItem("axd:nav-epinglee") === "1"); } catch {}
    const onAxia = (e: Event) => setAxiaOuvert(!!(e as CustomEvent).detail);
    const mq = window.matchMedia("(min-width: 1500px)");
    const onMq = () => setLarge(mq.matches);
    onMq();
    window.addEventListener("axia:panneau", onAxia);
    mq.addEventListener("change", onMq);
    return () => { window.removeEventListener("axia:panneau", onAxia); mq.removeEventListener("change", onMq); };
  }, []);
  const basculerEpingle = () => setEpinglee((v) => {
    try { localStorage.setItem("axd:nav-epinglee", v ? "0" : "1"); } catch {}
    return !v;
  });
  const rail = !parametres && (!epinglee || (axiaOuvert && !large));

  // Le tiroir mobile se referme à chaque navigation et sur Échap.
  useEffect(() => { setNavOuverte(false); memoriserRetour(pathname); }, [pathname]);
  useEffect(() => {
    if (!navOuverte) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setNavOuverte(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOuverte]);

  if (modeCaisse) return <CaisseKiosk boutiqueNom={boutique?.nomBoutique} />;

  const nom = session?.user?.name ?? session?.user?.email ?? "";
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

      <div className="ax-admin ax-dashboard-shell axd-shell" data-nav-open={navOuverte || undefined} data-nav={rail ? "rail" : undefined} data-axia={axiaOuvert || undefined} data-onglets={avecOnglets || undefined}>
        <Suspense fallback={null}><NavigationInstantanee /></Suspense>
        <a href="#axd-contenu" className="sr-only focus:not-sr-only">{t("Aller au contenu")}</a>
        {/* Tiroir : fermeture par glissement vers la gauche. */}
        <div
          style={{ display: "contents" }}
          // Le tiroir se ferme au toucher, sans attendre la page suivante.
          onClickCapture={(e) => { if (lienInterne(e, location.origin, location.pathname)) setNavOuverte(false); }}
          onTouchStart={(e) => { toucher.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => { if (toucher.current !== null && e.changedTouches[0].clientX - toucher.current < -50) setNavOuverte(false); toucher.current = null; }}
        >
          {parametres ? (
            <SettingsSidebar boutiqueNom={boutique?.nomBoutique} boutiqueUrl={boutique?.url} nom={nom} email={session?.user?.email ?? ""}
              permissions={permissions} initiales={initiales(boutique?.nomBoutique)} />
          ) : (
            <Sidebar
              boutiqueNom={boutique?.nomBoutique} boutiqueUrl={boutique?.url}
              nom={nom} email={session?.user?.email ?? ""}
              palier={palier} permissions={permissions} modePos={modePos} commandesATraiter={commandesATraiter}
              epinglee={epinglee} onReduire={basculerEpingle}
            />
          )}
        </div>
        <div className="axd-nav-scrim" onClick={() => setNavOuverte(false)} aria-hidden />

        <MobileTopBar onMenu={() => setNavOuverte(true)} boutiqueNom={boutique?.nomBoutique} initiales={initiales(boutique?.nomBoutique)} menuEnHaut={!avecOnglets} />

        <main id="axd-contenu" className={`axd-main${fullBleed ? " axd-main--bleed" : ""}`}>
          {promo && estAccueilAxia && <CompteurPromoDashboard finLe={promo.finLe} maintenant={promo.maintenant} compact />}
          {!fullBleed && !parametres && <MobileRubriques pathname={pathname} permissions={permissions} palier={palier} />}
          {fullBleed ? children : (
            <div key={pathname} className={`axd-content axd-content--legacy ax-page-enter${parametres ? " axd-content--settings" : ""}`}>
              {promo && pathname === "/dashboard/accueil" && <CompteurPromoDashboard finLe={promo.finLe} maintenant={promo.maintenant} banniere />}
              {quotaAtteint && !promo && <QuotaBanner />}
              {children}
            </div>
          )}
        </main>

        {dock && <AxiaDock />}
        <VisitePage />
        {avecOnglets && <MobileTabBar pathname={pathname} permissions={permissions} palier={palier} commandesATraiter={commandesATraiter} onMenu={() => setNavOuverte(true)} />}
        <CommandPalette permissions={permissions} palier={palier} />
      </div>
    </>
  );
}
