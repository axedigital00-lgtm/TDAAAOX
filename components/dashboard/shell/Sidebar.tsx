"use client";
// Barre latérale de l'admin refondu (masterprompt §5.2, D18, D20) et barre des Paramètres (§9.1).
// Données et règles : ./menu.ts (mêmes droits, paliers et mode caisse que l'ancienne barre).
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/icones";
import { useT } from "@/components/I18nProvider";
import { useAbonnementOverlay } from "@/components/dashboard/AbonnementOverlayProvider";
import { palierAuMoins, type Palier } from "@/lib/plans";
import type { ModuleKey, Niveau } from "@/lib/permissions";
import { chercher, normaliser } from "@/lib/recherche-dashboard";
import { cn } from "@/lib/utils";
import { estActif, filtreParPermission, sectionsVisibles, SECTIONS_PARAMETRES, type ItemMenu, type SectionMenu } from "./menu";
import { Cloche, PuceBoutique, AvatarBoutique } from "./Compte";
import { ouvrirPalette } from "./CommandPalette";

export interface ShellProps {
  boutiqueNom?: string;
  boutiqueUrl?: string;
  nomCompte: string;
  email?: string;
  palier: Palier;
  /** undefined = propriétaire : aucun filtrage. */
  permissions?: Record<ModuleKey, Niveau>;
  modePos: "simple" | "pro";
  /** Parcours de démarrage : étapes restantes, hrefs des entrées à compléter (pastilles B10). */
  demarrage?: { restantes: number; hrefs: string[] } | null;
}

const ITEM = "relative flex h-[30px] w-full items-center gap-2.5 rounded-(--radius-md) px-2 text-left text-[13px] font-[550] whitespace-nowrap transition-colors duration-(--duration-fast)";
const SOUS_ITEM = "flex h-7 w-full items-center gap-2 rounded-(--radius-md) pr-2 pl-[38px] text-left text-[13px] font-medium whitespace-nowrap transition-colors duration-(--duration-fast)";

function Pastille({ valeur }: { valeur?: number | boolean }) {
  const t = useT();
  if (!valeur) return null;
  return typeof valeur === "number"
    ? <span aria-label={t("{0} étapes restantes", valeur)} className="ml-auto rounded-[7px] bg-(--color-nav-count-bg) px-1.5 text-[12px] leading-5 font-[550] text-(--color-nav-text)">{valeur}</span>
    : <span role="img" aria-label={t("À compléter")} title={t("À compléter")} className="ml-auto size-1.5 flex-none rounded-full bg-(--color-brand)" />;
}

/** Lien, ou bouton qui ouvre l'offre (palier insuffisant, Forfait). */
function LienNav({ item, className, actif, children, palier }: { item: ItemMenu; className: string; actif: boolean; palier: Palier; children: React.ReactNode }) {
  const { openAbonnement } = useAbonnementOverlay();
  const verrou = !!item.requiresPalier && !palierAuMoins(palier, item.requiresPalier);
  if (verrou) return <button type="button" className={className} onClick={() => openAbonnement(item.requiresPalier, item.messageVerrou)}>{children}<Icon name="lock" size={16} className="ml-auto text-(--color-nav-text-muted)" /></button>;
  if (item.opensAbonnement) return <button type="button" className={className} onClick={() => openAbonnement()}>{children}</button>;
  return <Link href={item.href} aria-current={actif ? "page" : undefined} className={className}>{children}</Link>;
}

function SectionNav({ section, palier, pastille, compact }: { section: SectionMenu; palier: Palier; pastille: (it: ItemMenu) => number | boolean; compact: boolean }) {
  const t = useT();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [parent, ...sous] = section.items;
  const actif = section.items.some((it) => estActif(it, pathname, sp));
  // Sous-items visibles seulement quand la section est active (§5.2) : son signal remonte sinon sur le parent.
  const signalCache = !actif && sous.some((it) => pastille(it));
  const valeur = pastille(parent!) || signalCache;
  return (
    <li>
      <LienNav item={parent!} palier={palier} actif={actif && estActif(parent!, pathname, sp)}
        className={cn(ITEM, actif ? "bg-(--color-nav-active) text-white" : "text-(--color-nav-text) hover:bg-(--color-nav-hover)")}>
        <span className="relative flex-none text-(--color-nav-icon)">
          <Icon name={section.icon} size={20} className={actif ? "text-white" : undefined} />
          {compact && (valeur || parent!.badge) && <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-(--color-brand)" />}
        </span>
        <span className={cn("truncate", compact && "sr-only")}>{t(section.label)}</span>
        {!compact && <Pastille valeur={valeur} />}
        {!compact && !valeur && parent!.badge && <span aria-hidden className="ml-auto size-1.5 flex-none rounded-full bg-(--color-text-subdued)" />}
      </LienNav>
      {actif && !compact && sous.length > 0 && (
        <ul className="mt-px space-y-px">
          {sous.map((it, i) => {
            const a = estActif(it, pathname, sp);
            return (
              <li key={it.href}>
                {it.section && it.section !== sous[i - 1]?.section && (
                  <p className="pt-2 pb-0.5 pl-[38px] text-[11px] font-[550] text-(--color-nav-text-muted)">{t(it.section)}</p>
                )}
                <LienNav item={it} palier={palier} actif={a}
                  className={cn(SOUS_ITEM, a ? "bg-(--color-nav-active) font-semibold text-white" : "text-(--color-nav-text-muted) hover:bg-(--color-nav-hover) hover:text-(--color-nav-text)")}>
                  <span className="truncate">{t(it.label)}</span>
                  <Pastille valeur={pastille(it)} />
                  {!pastille(it) && it.badge && <span aria-hidden className="ml-auto size-1.5 flex-none rounded-full bg-(--color-text-subdued)" />}
                </LienNav>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

/** Logo + champ de recherche (ouvre la palette). */
function Haut({ compact, action }: { compact: boolean; action?: React.ReactNode }) {
  const t = useT();
  return (
    <>
      <div className="flex h-9 flex-none items-center gap-2 pr-1 pl-1.5">
        <Link href="/dashboard/accueil" aria-label={t("Axso — revenir au tableau de bord")} className="flex min-w-0 items-center gap-2">
          <img src="/icon-192.png" alt="" width={26} height={26} className="size-[26px] flex-none rounded-(--radius-sm) bg-white p-0.5" />
          {!compact && <span className="text-[14px] font-[650] text-white">AXSO</span>}
        </Link>
        {action}
      </div>
      <button type="button" onClick={() => ouvrirPalette()} title={compact ? t("Rechercher") : undefined}
        className="mx-0.5 mt-1 mb-2.5 flex h-[34px] flex-none items-center gap-2 rounded-(--radius-lg) border border-(--color-nav-search-border) bg-(--color-nav-search-bg) px-2.5 text-left text-[13px] text-(--color-nav-text-muted) hover:bg-(--color-nav-search-bg-hover)">
        <Icon name="search" size={16} />
        <span className={cn("flex-1 truncate", compact && "sr-only")}>{t("Rechercher")}</span>
        {!compact && <kbd className="font-sans text-[12px] text-(--color-text-subdued)">Ctrl K</kbd>}
      </button>
    </>
  );
}

/** Contenu de la barre (barre de bureau et tiroir mobile). */
export function NavPrincipale({ palier, permissions, modePos, demarrage, boutiqueNom, boutiqueUrl, nomCompte, email, compact = false, action }: ShellProps & { compact?: boolean; action?: React.ReactNode }) {
  const t = useT();
  const pathname = usePathname();
  const sp = useSearchParams();
  const sections = sectionsVisibles(permissions, modePos, pathname, sp);
  const pastille = (it: ItemMenu): number | boolean =>
    it.href === "/dashboard/demarrer" ? demarrage?.restantes ?? 0 : !!demarrage?.hrefs.includes(it.href);
  const bloc = (b: SectionMenu["bloc"]) => sections.filter((s) => s.bloc === b).map((s) => (
    <SectionNav key={s.id} section={s} palier={palier} pastille={pastille} compact={compact} />
  ));
  const titre = (texte: string) => (compact
    ? <li aria-hidden className="mx-2 my-3 border-t border-(--color-nav-divider)" />
    : <li className="px-2 pt-4 pb-1 text-[12px] font-[550] text-(--color-nav-text-muted)">{t(texte)}</li>);
  const canaux = bloc("canaux");
  const applis = bloc("applis");
  return (
    <>
      <Haut compact={compact} action={action} />
      <nav aria-label={t("Menu principal")} className="adm-nav-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <ul className="space-y-px">
          {bloc("principal")}
          {canaux.length > 0 && titre("Canaux de vente")}
          {canaux}
          {applis.length > 0 && titre("Applications")}
          {applis}
        </ul>
      </nav>
      <div className="flex-none space-y-px border-t border-(--color-nav-divider) pt-1.5">
        <ul className="space-y-px">{bloc("pied")}</ul>
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1"><PuceBoutique boutiqueNom={boutiqueNom} boutiqueUrl={boutiqueUrl} nomCompte={nomCompte} email={email} compact={compact} /></div>
          {!compact && <Cloche versLeHaut />}
        </div>
      </div>
    </>
  );
}

const CLE_REPLIE = "sidebar_repliee";

/** Barre de bureau : 240 px, repliable en icônes (64 px), dépliée par-dessus le contenu au survol (D18). */
export function Sidebar(props: ShellProps) {
  const t = useT();
  const [repliee, setRepliee] = useState(false);
  const [survol, setSurvol] = useState(false);
  useEffect(() => { try { setRepliee(localStorage.getItem(CLE_REPLIE) === "1"); } catch { /* stockage indisponible */ } }, []);
  const basculer = () => {
    const v = !repliee;
    setRepliee(v); setSurvol(false);
    try { localStorage.setItem(CLE_REPLIE, v ? "1" : "0"); } catch { /* stockage indisponible */ }
  };
  const etendue = !repliee || survol;
  return (
    <div className="relative h-full flex-none" style={{ width: repliee ? 64 : 240 }}>
      <aside
        onMouseEnter={() => repliee && setSurvol(true)}
        onMouseLeave={() => setSurvol(false)}
        onFocus={(e) => { if (repliee && e.target.matches(":focus-visible")) setSurvol(true); }}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSurvol(false); }}
        className={cn("absolute inset-y-0 left-0 z-(--z-nav-drawer) flex flex-col bg-(--color-frame) pt-2.5 pr-2 pb-2 pl-3 transition-[width] duration-(--duration-drawer)",
          repliee && survol && "shadow-(--shadow-drawer)")}
        style={{ width: etendue ? 240 : 64 }}>
        <NavPrincipale {...props} compact={!etendue}
          action={etendue && (
            <button type="button" onClick={basculer} aria-pressed={repliee}
              aria-label={repliee ? t("Garder la barre latérale ouverte") : t("Réduire la barre latérale")} title={repliee ? t("Garder la barre latérale ouverte") : t("Réduire la barre latérale")}
              className="ml-auto flex size-7 flex-none items-center justify-center rounded-(--radius-md) text-(--color-nav-icon) hover:bg-(--color-nav-hover) hover:text-white">
              <Icon name="panel" size={16} />
            </button>
          )} />
      </aside>
    </div>
  );
}

const CLE_RETOUR = "adm_retour";
/** Mémorise la dernière page hors Paramètres (bouton « ‹ Paramètres »). */
export function memoriserRetour(pathname: string) {
  if (!pathname.startsWith("/dashboard/parametres")) try { sessionStorage.setItem(CLE_RETOUR, pathname); } catch { /* stockage indisponible */ }
}

/** Barre des Paramètres (§9.1) : remplace la barre principale sur /dashboard/parametres/*. */
export function SettingsSidebar({ boutiqueNom, boutiqueUrl, nomCompte, email, palier, permissions }: ShellProps) {
  const t = useT();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState("");
  const [retour, setRetour] = useState("/dashboard/demarrer");
  useEffect(() => { try { setRetour(sessionStorage.getItem(CLE_RETOUR) || "/dashboard/demarrer"); } catch { /* stockage indisponible */ } }, []);
  const toutes = filtreParPermission(SECTIONS_PARAMETRES, permissions);
  const liste = q.trim() ? chercher(toutes, q, (s) => ({ principal: `${s.label} ${t(s.label)}` })) : toutes;
  const domaine = boutiqueUrl?.replace(/^https?:\/\//, "");
  return (
    <div className="flex h-full w-[270px] flex-col bg-(--color-frame) pt-2.5 pr-2 pb-2 pl-3">
      <Link href={retour} className="flex h-9 items-center gap-1.5 rounded-(--radius-md) px-1.5 text-[14px] font-[650] text-white hover:bg-(--color-nav-hover)">
        <Icon name="chevronLeft" size={16} />{t("Paramètres")}
      </Link>
      <label className="mx-0.5 mt-1 mb-2.5 flex h-[34px] items-center gap-2 rounded-(--radius-lg) border border-(--color-nav-search-border) bg-(--color-nav-search-bg) px-2.5 text-(--color-nav-text-muted) focus-within:border-(--color-nav-text-muted)">
        <Icon name="search" size={16} />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Rechercher dans les paramètres")} aria-label={t("Rechercher dans les paramètres")}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-(--color-nav-text-muted)" />
      </label>
      <div className="mb-2 flex items-center gap-2 rounded-(--radius-lg) bg-(--color-nav-hover) px-2.5 py-2">
        <AvatarBoutique nom={boutiqueNom} taille={28} />
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-[550] text-white">{boutiqueNom || t("Ma boutique")}</span>
          {domaine && <span className="block truncate text-[12px] text-(--color-nav-text-muted)">{domaine}</span>}
        </span>
      </div>
      <nav aria-label={t("Paramètres")} className="adm-nav-scroll min-h-0 flex-1 overflow-y-auto">
        <ul className="space-y-px">
          {liste.map((s) => {
            const a = estActif(s, pathname, sp);
            return (
              <li key={s.href}>
                <LienNav item={s} palier={palier} actif={a} className={cn(ITEM, a ? "bg-(--color-nav-active) text-white" : "text-(--color-nav-text) hover:bg-(--color-nav-hover)")}>
                  <Icon name={s.icon} size={18} className="flex-none text-(--color-nav-icon)" />
                  <span className="truncate">{t(s.label)}</span>
                </LienNav>
              </li>
            );
          })}
          {liste.length === 0 && <li className="px-2 py-3 text-[12px] text-(--color-nav-text-muted)">{t("Aucun résultat pour « {0} »", q.trim())}</li>}
        </ul>
      </nav>
      <div className="flex items-center gap-2 border-t border-(--color-nav-divider) px-1.5 pt-2">
        <span aria-hidden className="flex size-7 flex-none items-center justify-center rounded-full bg-(--color-nav-active) text-[11px] font-bold text-white">{normaliser(nomCompte || "?").slice(0, 1).toUpperCase()}</span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-[550] text-white">{nomCompte || t("Mon compte")}</span>
          {email && <span className="block truncate text-[12px] text-(--color-nav-text-muted)">{email}</span>}
        </span>
      </div>
    </div>
  );
}
