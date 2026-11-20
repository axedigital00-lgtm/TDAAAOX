"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar de l'admin marchand (MASTERPROMPT §5.2).
//
// Haut : logo + recherche (ouvre la palette Ctrl K). Milieu : sections, puis
// « Canaux de vente › » et « Applications › ». Les sous-items d'une section ne
// sont visibles que lorsque la section est active. Pied : Paramètres et puce
// boutique (menu du compte + notifications).
//
// Les items sans accès (permissions d'équipe) disparaissent ; ceux au-dessus
// du palier restent visibles avec un cadenas et ouvrent l'offre d'abonnement.
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { useAbonnementOverlay } from "@/components/dashboard/AbonnementOverlayProvider";
import type { Palier } from "@/lib/plans";
import type { ModuleKey, Niveau } from "@/lib/permissions";
import { useT } from "@/components/I18nProvider";
import { Icon } from "@/components/dashboard/design-system/icons/Icon";
import {
  NAV, CHANNELS, APPS, SETTINGS, autorise, verrouille, sectionActive,
  type NavSection, type NavLink,
} from "@/components/dashboard/design-system/layout/navigation";
import {
  AccountPanel, NotificationsPanel, useFermeture, useNotifications,
} from "@/components/dashboard/design-system/layout/AccountPanels";
import { ouvrirRecherche } from "@/components/dashboard/design-system/layout/CommandPalette";
import { ChannelsModal, AppsModal } from "@/components/dashboard/design-system/layout/NavModals";

export interface SidebarProps {
  boutiqueNom?: string;
  boutiqueUrl?: string;
  nom?: string;
  email?: string;
  palier?: Palier;
  /** undefined = propriétaire : aucun filtrage n'est appliqué. */
  permissions?: Record<ModuleKey, Niveau>;
  /** Mode de la caisse : "simple" n'affiche que les liens essentiels de l'application Caisse. */
  modePos?: "simple" | "pro";
  /** Commandes à traiter (compteur de l'item Commandes). */
  commandesATraiter?: number;
  /** Barre épinglée ouverte (sinon : rail qui s'ouvre au survol). */
  epinglee?: boolean;
  onReduire?: () => void;
}

export function initiales(nom?: string) {
  const mots = (nom ?? "").trim().split(/\s+/).filter(Boolean);
  return ((mots[0]?.[0] ?? "A") + (mots[1]?.[0] ?? "")).toUpperCase();
}

const fmtNombre = (n: number) => n.toLocaleString("fr-FR").replace(/\s/g, " ");

export function Sidebar({ boutiqueNom, boutiqueUrl, nom = "", email = "", palier, permissions, modePos = "simple", commandesATraiter = 0, epinglee = false, onReduire }: SidebarProps) {
  const t = useT();
  const pathname = usePathname();
  const { openAbonnement } = useAbonnementOverlay();
  const [modale, setModale] = useState<"canaux" | "applis" | null>(null);
  const [panneau, setPanneau] = useState<"compte" | "notifs" | null>(null);
  const pied = useRef<HTMLDivElement>(null);
  const fermer = useCallback(() => setPanneau(null), []);
  useFermeture(!!panneau, fermer, pied);
  const notifs = useNotifications();

  const filtrer = (sections: NavSection[]) => sections
    .filter((s) => autorise(s, permissions))
    .map((s) => ({
      ...s,
      sub: s.sub?.filter((l) => autorise(l, permissions) && (s.id !== "pos" || modePos === "pro" || l.essentiel || pathname.startsWith(l.href))),
    }));
  const nav = filtrer(NAV), canaux = filtrer(CHANNELS), applis = filtrer(APPS);
  const { section: active, sub: subActif } = sectionActive([...nav, ...canaux, ...applis, SETTINGS], pathname);

  // `actif` : fond actif sans être la page courante (parent d'un sous-item actif).
  const lien = (l: NavLink, contenu: React.ReactNode, className: string, courant: boolean, actif = false) => {
    if (verrouille(l, palier)) {
      return <button type="button" className={className} onClick={() => openAbonnement(l.requiresPalier, l.messageVerrou)}>{contenu}</button>;
    }
    return <Link href={l.href} className={className} aria-current={courant ? "page" : undefined} data-active={actif || undefined} prefetch={false}>{contenu}</Link>;
  };

  const item = (s: NavSection) => {
    const estActive = active?.id === s.id;
    const bloque = verrouille(s, palier);
    // Section verrouillée mais sous-items accessibles : le titre mène au premier d'entre eux.
    const premierLibre = bloque ? s.sub?.find((l) => !verrouille(l, palier)) : undefined;
    const cible: NavLink = premierLibre ?? s;
    const contenu = (
      <>
        <Icon name={s.icon} size={20} />
        <span className="axd-nav-item__label">{t(s.label)}</span>
        {bloque && !premierLibre && <Icon name="lock" />}
        {s.count === "commandes" && commandesATraiter > 0 && <span className="axd-nav-item__count">{fmtNombre(commandesATraiter)}</span>}
        {s.dot && <span className="axd-nav-item__dot" />}
      </>
    );
    return (
      <div key={s.id}>
        {lien(cible, contenu, `axd-nav-item${bloque && !premierLibre ? " axd-nav-item--locked" : ""}`, estActive && !subActif, estActive)}
        {estActive && s.sub && s.sub.length > 0 && (
          <div className="axd-nav-sub">
            {s.sub.filter((l) => l.href !== s.href || s.sub!.length > 1).map((l) =>
              <div key={l.href}>{lien(l, <><span className="axd-nav-sub__label">{t(l.label)}</span>{verrouille(l, palier) && <Icon name="lock" size={14} />}</>, "", subActif === l)}</div>,
            )}
          </div>
        )}
      </div>
    );
  };
  return (
    <aside className="axd-nav" aria-label={t("Navigation principale")}>
      <div className="axd-nav__top">
        <Link href="/dashboard/accueil" className="axd-logo" prefetch={false}>
          <img src="/logo-dark.png" alt="AXSO" />
        </Link>
        {onReduire && (
          <button type="button" className="axd-nav__iconbtn axd-nav__pin" onClick={onReduire} aria-pressed={epinglee}
            aria-label={epinglee ? t("Réduire la barre latérale") : t("Garder la barre latérale ouverte")} title={epinglee ? t("Réduire la barre latérale") : t("Garder la barre latérale ouverte")}>
            <Icon name="panel" />
          </button>
        )}
      </div>

      <button type="button" className="axd-nav-search" onClick={ouvrirRecherche}>
        <Icon name="search" /><span>{t("Rechercher")}</span><kbd>Ctrl K</kbd>
      </button>

      <nav className="axd-nav__scroll">
        {nav.map(item)}
        <button type="button" className="axd-nav-label" onClick={() => setModale("canaux")}>
          {t("Canaux de vente")} <Icon name="chevronRight" />
        </button>
        {canaux.map(item)}
        <button type="button" className="axd-nav-label" onClick={() => setModale("applis")}>
          {t("Applications")} <Icon name="chevronRight" />
        </button>
        {applis.map(item)}
      </nav>

      <div className="axd-nav__bottom" ref={pied}>
        {lien(SETTINGS, <><Icon name="gear" size={20} /><span className="axd-nav-item__label">{t(SETTINGS.label)}</span></>, "axd-nav-item", active?.id === SETTINGS.id)}
        <div className="axd-store-chip">
          <button type="button" className="axd-store-chip__main" onClick={() => setPanneau((p) => (p === "compte" ? null : "compte"))}
            aria-expanded={panneau === "compte"} aria-haspopup="menu">
            <span className="axd-store-av">{initiales(boutiqueNom)}</span>
            <span className="axd-store-chip__name">{t(boutiqueNom) || t("Ma boutique")}</span>
          </button>
          <button type="button" className="axd-bell" onClick={() => setPanneau((p) => (p === "notifs" ? null : "notifs"))}
            aria-expanded={panneau === "notifs"} aria-label={t("Notifications")}>
            <Icon name="bell" />
            {notifs.nonLues > 0 && <b>{notifs.nonLues > 9 ? "9+" : notifs.nonLues}</b>}
          </button>
        </div>
        {panneau && (
          <div className="axd-nav-pop" style={panneau === "notifs" ? { width: 340 } : undefined}>
            {panneau === "compte"
              ? <AccountPanel onClose={fermer} nom={nom} email={email} boutiqueUrl={boutiqueUrl} />
              : <NotificationsPanel onClose={fermer} data={notifs} />}
          </div>
        )}
      </div>

      <ChannelsModal open={modale === "canaux"} onClose={() => setModale(null)} />
      <AppsModal open={modale === "applis"} onClose={() => setModale(null)} permissions={permissions} installed={applis} />
    </aside>
  );
}
