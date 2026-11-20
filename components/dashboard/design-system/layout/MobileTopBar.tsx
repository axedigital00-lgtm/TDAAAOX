"use client";
// Barre supérieure mobile (≤ 820px, §13.3) : ☰ · Rechercher · Stella · cloche · avatar boutique.

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Icon, AxiaMark } from "../icons/Icon";
import { ouvrirRecherche } from "./CommandPalette";
import { NotificationsPanel, useFermeture, useNotifications } from "./AccountPanels";
import { ouvrirAxia } from "./AxiaDock";

export function MobileTopBar({ onMenu, boutiqueNom, initiales }: { onMenu: () => void; boutiqueNom?: string; initiales: string }) {
  const t = useT();
  const notifs = useNotifications();
  const [ouvert, setOuvert] = useState(false);
  const zone = useRef<HTMLDivElement>(null);
  const fermer = useCallback(() => setOuvert(false), []);
  useFermeture(ouvert, fermer, zone);

  return (
    <div className="axd-mobile-top" ref={zone}>
      <button type="button" className="axd-mobile-top__btn" onClick={onMenu} aria-label={t("Menu")}><Icon name="menu" size={20} /></button>
      <button type="button" className="axd-mobile-search" onClick={ouvrirRecherche}><Icon name="search" />{t("Rechercher")}</button>
      <button type="button" className="axd-mobile-top__btn" onClick={() => ouvrirAxia()} aria-label="Stella"><AxiaMark size={24} surface="dark" /></button>
      <button type="button" className="axd-mobile-top__btn" onClick={() => setOuvert((v) => !v)} aria-label={t("Notifications")} aria-expanded={ouvert}>
        <Icon name="bell" size={20} />
        {notifs.nonLues > 0 && <b>{notifs.nonLues > 9 ? "9+" : notifs.nonLues}</b>}
      </button>
      <Link href="/dashboard/parametres" className="axd-mobile-top__btn" aria-label={boutiqueNom ? t("Paramètres de {0}", boutiqueNom) : t("Paramètres")}>
        <span className="axd-store-av">{initiales}</span>
      </Link>
      {ouvert && (
        <div className="axd-nav-pop" style={{ top: "calc(var(--mobile-bar-height) + 4px)", bottom: "auto" }}>
          <NotificationsPanel onClose={fermer} data={notifs} />
        </div>
      )}
    </div>
  );
}
