"use client";
// Navigation mobile (≤ 820px) : six espaces en barre d'onglets fixe en bas,
// et la rangée des rubriques de l'espace actif en haut de la page.

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useT } from "@/components/I18nProvider";
import type { Palier } from "@/lib/plans";
import type { ModuleKey, Niveau } from "@/lib/permissions";
import { Icon } from "../icons/Icon";
import { ESPACES_MOBILE, autorise, verrouille, sectionActive } from "./navigation";

type Droits = { permissions?: Record<ModuleKey, Niveau>; palier: Palier };

/** Espaces visibles, réduits aux rubriques autorisées et ouvertes au palier. */
function espacesVisibles({ permissions, palier }: Droits) {
  return ESPACES_MOBILE
    .map((e) => ({ ...e, sub: e.sub.filter((l) => autorise(l, permissions) && !verrouille(l, palier)) }))
    .filter((e) => e.sub.length > 0)
    .map((e) => ({ ...e, href: e.sub[0].href }));
}

function espaceActif(espaces: ReturnType<typeof espacesVisibles>, pathname: string) {
  return sectionActive(espaces, pathname);
}

export function MobileTabBar({ pathname, commandesATraiter = 0, onMenu, ...droits }: Droits & { pathname: string; commandesATraiter?: number; onMenu: () => void }) {
  const t = useT();
  const espaces = espacesVisibles(droits);
  const { section } = espaceActif(espaces, pathname);
  return (
    <nav className="axd-tabbar" aria-label={t("Navigation principale")}>
      {espaces.map((e) => {
        const actif = section?.id === e.id;
        return (
          <Link key={e.id} href={e.href} className="axd-tabbar__tab" data-guide={`tab-${e.id}`} aria-current={actif ? "page" : undefined}>
            <span className="axd-tabbar__ic">
              <Icon name={e.icon} size={20} />
              {e.count === "commandes" && commandesATraiter > 0 && <b>{commandesATraiter > 99 ? "99+" : commandesATraiter}</b>}
            </span>
            <span className="axd-tabbar__lb">{t(e.court ?? e.label)}</span>
          </Link>
        );
      })}
      {/* Menu complet à portée de pouce, en bas à droite. */}
      <button type="button" className="axd-tabbar__tab axd-tabbar__menu" onClick={onMenu} aria-label={t("Menu")}>
        <span className="axd-tabbar__ic"><Icon name="menu" size={20} /></span>
      </button>
    </nav>
  );
}

export function MobileRubriques({ pathname, ...droits }: Droits & { pathname: string }) {
  const t = useT();
  const rangee = useRef<HTMLDivElement>(null);
  const { section, sub } = espaceActif(espacesVisibles(droits), pathname);
  // La rubrique active reste visible dans la rangée défilante.
  useEffect(() => {
    const el = rangee.current?.querySelector<HTMLElement>("[aria-current]");
    if (el && rangee.current) rangee.current.scrollLeft = el.offsetLeft - 16;
  }, [pathname]);
  if (!section || section.sub!.length < 2) return null;
  const actif = sub ?? section.sub![0];
  return (
    <div className="axd-rubriques" ref={rangee} role="navigation" aria-label={t(section.label)}>
      {section.sub!.map((l) => (
        <Link key={l.href} href={l.href} className="axd-rubrique" aria-current={l === actif ? "page" : undefined}>{t(l.label)}</Link>
      ))}
    </div>
  );
}
