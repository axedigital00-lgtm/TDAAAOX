"use client";
// Cadre de l'admin marchand refondu (masterprompt §5, §10, §11, §13 ; D12, D18).
// Reprend tout ce que fait l'ancien DashboardShell (components/dashboard/DashboardShell.tsx) :
// mode caisse (kiosque), tour de bienvenue, pages plein écran (constructeur, thèmes), compteur de
// la promo, bandeau de quota, panneau AXIA monté une seule fois, children monté une seule fois.
// L'ancien cadre reste disponible avec le cookie admin_v2=0 (app/(dashboard)/layout.tsx), jusqu'au lot 15.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, ShoppingCart, Store, Users } from "lucide-react";
import { Icon } from "@/components/ui/icones";
import { useT } from "@/components/I18nProvider";
import { CaisseKiosk } from "@/components/dashboard/CaisseKiosk";
import { ModuleTutorial } from "@/components/dashboard/ModuleTutorial";
import { QuotaBanner } from "@/components/dashboard/QuotaBanner";
import { CompteurPromoDashboard } from "@/components/promo/CompteurPromo";
import { AxiaPanneau, basculerAxia, ouvrirAxia, useEtatAxia } from "@/components/dashboard/AxiaPanneau";
import type { Palier } from "@/lib/plans";
import type { ModuleKey, Niveau } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Banner, Modal } from "@/components/ui/adm";
import { inter } from "@/app/(dashboard)/police";
import { Sidebar, SettingsSidebar, NavPrincipale, memoriserRetour, type ShellProps } from "./Sidebar";
import { CommandPalette, ouvrirPalette } from "./CommandPalette";
import { Cloche, AvatarBoutique } from "./Compte";

const PLEIN_ECRAN = ["/dashboard/builder", "/dashboard/themes"];
// Pages qui ont leur propre champ AXIA (Accueil) : pas de dock.
const SANS_DOCK = ["/dashboard/demarrer", "/dashboard/accueil"];
// Raccourcis « G puis … » (§11).
const ALLER: Record<string, string> = { h: "/dashboard/demarrer", o: "/dashboard/commandes", p: "/dashboard/produits", c: "/dashboard/clients", a: "/dashboard/analytics" };

const BIENVENUE_STEPS = [
  { Icon: Sparkles, titre: "AXIA, votre assistante boutique", description: "AXIA vit dans le panneau à droite : ouvrez-le avec « Travailler avec AXIA » en bas de l'écran (ou le bouton AXIA de la barre du haut sur téléphone). Posez-lui une question ou demandez-lui d'agir : créer un produit, lancer une promo, relancer un client." },
  { Icon: ShoppingCart, titre: "Commandes et produits", description: "Gérez vos ventes et votre catalogue depuis la barre latérale. Ctrl+K ouvre la recherche partout." },
  { Icon: Store, titre: "Boutique en ligne et point de vente", description: "Personnalisez votre boutique en ligne, ou passez au point de vente pour encaisser en magasin (Canaux de vente)." },
  { Icon: Users, titre: "Votre équipe", description: "Invitez des collaborateurs (gérant, caissier, comptable…) avec des accès précis depuis Paramètres › Utilisateurs." },
];

export interface AppShellProps {
  children: React.ReactNode;
  session: any;
  boutique: { slug: string; nomBoutique: string; url?: string } | null;
  quotaAtteint: boolean;
  palier: Palier;
  permissions?: Record<ModuleKey, Niveau>;
  /** Caissier pur (estCaissierPur) : kiosque plein écran sur toutes les routes. */
  modeCaisse?: boolean;
  modePos?: "simple" | "pro";
  promo?: { finLe: string; maintenant: number } | null;
  demarrage?: { restantes: number; hrefs: string[] } | null;
}

function estSaisie(el: EventTarget | null) {
  const e = el as HTMLElement | null;
  return !!e && (e.tagName === "INPUT" || e.tagName === "TEXTAREA" || e.tagName === "SELECT" || e.isContentEditable);
}

export function AppShell({ children, session, boutique, quotaAtteint, palier, permissions, modeCaisse, modePos = "simple", promo, demarrage }: AppShellProps) {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const [tiroir, setTiroir] = useState(false);
  const [aide, setAide] = useState(false);
  const enLigne = useEnLigne();
  const pleinEcran = PLEIN_ECRAN.some((r) => pathname.startsWith(r));
  const parametres = pathname.startsWith("/dashboard/parametres");

  // Un tiroir ouvert se ferme à chaque navigation ; la dernière page hors Paramètres sert au bouton retour.
  useEffect(() => { setTiroir(false); memoriserRetour(pathname); }, [pathname]);

  // G puis H/O/P/C/A : aller à Accueil / Commandes / Produits / Clients / Analyses.
  const g = useRef(0);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || estSaisie(e.target)) return;
      if (e.key === "?") { e.preventDefault(); setAide(true); return; }
      const k = e.key.toLowerCase();
      if (Date.now() - g.current < 1000 && ALLER[k]) { g.current = 0; router.push(ALLER[k]); return; }
      g.current = k === "g" ? Date.now() : 0;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  if (modeCaisse) return <CaisseKiosk boutiqueNom={boutique?.nomBoutique} />;

  const props: ShellProps = {
    boutiqueNom: boutique?.nomBoutique, boutiqueUrl: boutique?.url ?? (boutique ? `/${boutique.slug}` : undefined),
    nomCompte: session?.user?.name || session?.user?.email || "", email: session?.user?.email || undefined,
    palier, permissions, modePos, demarrage,
  };

  return (
    <div className={cn("adm", inter.variable)}>
      <ModuleTutorial moduleKey="bienvenue" storageKey={`bienvenue:${session?.user?.tenantId ?? "defaut"}`} autoOpen
        titre={t("Bienvenue sur AXSO")} sousTitre={t("Un tour rapide pour démarrer")} steps={BIENVENUE_STEPS} />

      <div className="flex h-dvh overflow-hidden bg-(--color-frame) min-[821px]:pr-1.5 min-[821px]:pb-1.5">
        <div className="h-full max-[820px]:hidden">{parametres ? <SettingsSidebar {...props} /> : <Sidebar {...props} />}</div>

        <div className="flex min-w-0 flex-1 flex-col">
          <BarreMobile boutiqueNom={props.boutiqueNom} onMenu={() => setTiroir(true)} />
          <main className={cn("adm-main min-h-0 flex-1 bg-(--color-bg) min-[821px]:mt-1.5 min-[821px]:rounded-(--radius-xl)",
            pleinEcran ? "flex flex-col overflow-hidden" : "overflow-y-auto")}>
            {pleinEcran ? children : (
              <div key={pathname} className="ax-page-enter mx-auto w-full max-w-[1200px] space-y-4 px-(--page-padding-x) pt-4 pb-[120px] md:space-y-0">
                {!enLigne && (
                  <Banner tone="warning" className="sticky top-0 z-(--z-header) mb-4 max-[820px]:top-[52px]">
                    {t("Vous êtes hors ligne. Vos modifications ne pourront pas être enregistrées tant que la connexion n'est pas revenue.")}
                  </Banner>
                )}
                {promo && <CompteurPromoDashboard finLe={promo.finLe} maintenant={promo.maintenant} />}
                {quotaAtteint && !promo && <QuotaBanner />}
                {children}
              </div>
            )}
          </main>
        </div>

        {/* AXIA : colonne de 400 px qui pousse le contenu (D12), plein écran en dessous de 1024 px. */}
        <div className="adm-axia contents"><AxiaPanneau /></div>
      </div>

      <Tiroir ouvert={tiroir} onClose={() => setTiroir(false)}>
        {parametres ? <SettingsSidebar {...props} /> : <div className="flex h-full flex-col pt-2.5 pr-2 pb-2 pl-3"><NavPrincipale {...props} /></div>}
      </Tiroir>
      {!pleinEcran && !SANS_DOCK.includes(pathname) && <AxiaDock />}
      <CommandPalette permissions={permissions} />
      <AideRaccourcis ouvert={aide} onClose={() => setAide(false)} />
    </div>
  );
}

// navigator.onLine : faux seulement quand l'appareil n'a plus de réseau du tout (pas une connexion lente).
const abonnerReseau = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => { window.removeEventListener("online", cb); window.removeEventListener("offline", cb); };
};
function useEnLigne() {
  return useSyncExternalStore(abonnerReseau, () => navigator.onLine, () => true);
}

/** Aide des raccourcis (« ? », §11) : uniquement ceux qui sont réellement codés. */
const RACCOURCIS: [string[], string][] = [
  [["Ctrl", "K"], "Rechercher des pages, commandes, produits, clients…"],
  [["Ctrl", "J"], "Ouvrir ou fermer AXIA"],
  [["Ctrl", "S"], "Enregistrer les modifications d'une fiche"],
  [["G", "H"], "Aller à l'Accueil"],
  [["G", "O"], "Aller aux Commandes"],
  [["G", "P"], "Aller aux Produits"],
  [["G", "C"], "Aller aux Clients"],
  [["G", "A"], "Aller aux Analyses"],
  [["Échap"], "Fermer la fenêtre ou le panneau"],
  [["?"], "Afficher cette aide"],
];
function AideRaccourcis({ ouvert, onClose }: { ouvert: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Modal open={ouvert} onClose={onClose} size="sm" title={t("Raccourcis clavier")}>
      <dl className="m-0 divide-y divide-(--color-border-secondary)">
        {RACCOURCIS.map(([touches, action]) => (
          <div key={action} className="flex items-center justify-between gap-3 py-2">
            <dt className="text-(--color-text)">{t(action)}</dt>
            <dd className="m-0 flex flex-none gap-1">
              {touches.map((k) => (
                <kbd key={k} className="min-w-6 rounded-(--radius-sm) bg-(--color-surface-tertiary) px-1.5 text-center font-sans text-xs font-[550] text-(--color-text-strong)">{k === "Échap" ? t("Échap") : k}</kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 mb-0 text-xs text-(--color-text-secondary)">{t("Sur Mac, Ctrl correspond à ⌘. Les touches G puis une lettre s'enchaînent en moins d'une seconde.")}</p>
    </Modal>
  );
}

/** Barre supérieure mobile (≤ 820 px, §13.3). */
export function BarreMobile({ boutiqueNom, onMenu }: { boutiqueNom?: string; onMenu: () => void }) {
  const t = useT();
  const { compte } = useEtatAxia();
  const bouton = "flex size-9 flex-none items-center justify-center rounded-(--radius-lg) text-(--color-nav-icon) hover:bg-(--color-nav-hover)";
  return (
    <header className="sticky top-0 z-(--z-mobile-top) flex h-[52px] flex-none items-center gap-1.5 bg-(--color-frame) px-2 pt-[env(safe-area-inset-top)] min-[821px]:hidden">
      <button type="button" onClick={onMenu} aria-label={t("Ouvrir le menu")} className={bouton}><Icon name="menu" size={20} /></button>
      <button type="button" onClick={() => ouvrirPalette()} className="flex h-[34px] min-w-0 flex-1 items-center gap-2 rounded-(--radius-lg) border border-(--color-nav-search-border) bg-(--color-nav-search-bg) px-2.5 text-[13px] text-(--color-nav-text-muted)">
        <Icon name="search" size={16} /><span className="truncate">{t("Rechercher")}</span>
      </button>
      <button type="button" onClick={basculerAxia} className={cn(bouton, "relative")}
        aria-label={compte > 0 ? t("AXIA : {0} propositions en attente", String(compte)) : t("Ouvrir AXIA")}>
        <AvatarAxia />
        {compte > 0 && <span className="absolute top-0.5 right-0.5 size-2 rounded-full bg-(--color-notification)" />}
      </button>
      <Cloche />
      <Link href="/dashboard/parametres" aria-label={t("Paramètres de la boutique")} className={bouton}><AvatarBoutique nom={boutiqueNom} taille={24} /></Link>
    </header>
  );
}

/** Tiroir mobile : 290 px depuis la gauche ; voile, Échap, lien suivi ou glissement vers la gauche le ferment. */
function Tiroir({ ouvert, onClose, children }: { ouvert: boolean; onClose: () => void; children: React.ReactNode }) {
  const t = useT();
  const debut = useRef<number | null>(null);
  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ouvert, onClose]);
  return (
    <div className="min-[821px]:hidden" inert={!ouvert}>
      <div aria-hidden onClick={onClose} className={cn("fixed inset-0 z-(--z-nav-scrim) bg-black/45 transition-opacity duration-(--duration-drawer)", ouvert ? "opacity-100" : "pointer-events-none opacity-0")} />
      <div role="dialog" aria-modal="true" aria-label={t("Menu principal")}
        onTouchStart={(e) => { debut.current = e.touches[0]!.clientX; }}
        onTouchEnd={(e) => { if (debut.current !== null && e.changedTouches[0]!.clientX - debut.current < -60) onClose(); debut.current = null; }}
        className={cn("fixed inset-y-0 left-0 z-(--z-nav-drawer) w-[290px] max-w-[85vw] bg-(--color-frame) pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] transition-transform duration-(--duration-drawer) ease-out [&>*]:w-full",
          ouvert ? "translate-x-0" : "-translate-x-[105%]")}>
        {children}
      </div>
    </div>
  );
}

/** Avatar AXIA : carré bleu nuit, étoile jaune (§10). */
function AvatarAxia() {
  return (
    <span aria-hidden className="flex size-[22px] flex-none items-center justify-center rounded-[7px] bg-(--color-brand-ink) text-(--color-brand)">
      <Icon name="sparkle" size={16} />
    </span>
  );
}

/** Dock « Travailler avec AXIA » (§10, D12) : toutes les pages sauf l'Accueil, masqué quand le panneau est ouvert.
 *  L'accès suit le plan (D13) : AxiaPanneau affiche l'offre Pro à un compte Essentiel. */
export function AxiaDock() {
  const t = useT();
  const { ouvert } = useEtatAxia();
  if (ouvert) return null;
  return (
    <div className="fixed bottom-[18px] left-1/2 z-(--z-dock) flex h-11 w-[360px] -translate-x-1/2 items-center gap-1 rounded-(--radius-2xl) bg-(--color-surface) pr-1.5 pl-2.5 shadow-(--shadow-popover) min-[821px]:ml-[120px] max-[820px]:inset-x-3 max-[820px]:bottom-[calc(12px+env(safe-area-inset-bottom))] max-[820px]:w-auto max-[820px]:translate-x-0">
      <AvatarAxia />
      <button type="button" onClick={() => ouvrirAxia()} className="h-full min-w-0 flex-1 truncate px-1.5 text-left text-[13px] text-(--color-text-secondary)">{t("Travailler avec AXIA")}</button>
      <span aria-hidden className="h-5 w-px bg-(--color-border)" />
      <button type="button" onClick={() => ouvrirAxia()} aria-label={t("Ouvrir le panneau AXIA")} title={t("Ouvrir le panneau AXIA")}
        className="flex size-7 items-center justify-center rounded-(--radius-md) text-(--color-icon-header) hover:bg-(--color-surface-tertiary)">
        <Icon name="panel" size={16} />
      </button>
    </div>
  );
}
