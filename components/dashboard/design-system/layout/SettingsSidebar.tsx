"use client";
// Sidebar des Paramètres (MASTERPROMPT §9.1) : remplace la sidebar principale
// sur toutes les routes de réglages. Sections branchées sur les pages existantes ;
// celles qui n'existent pas encore ne sont pas listées (DECISIONS.md).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ModuleKey, Niveau } from "@/lib/permissions";
import { useT } from "@/components/I18nProvider";
import { Icon, type IconName } from "../icons/Icon";
import { autorise } from "./navigation";

export const SECTIONS_PARAMETRES: { href: string; icon: IconName; label: string; moduleKey?: ModuleKey; mots?: string }[] = [
  { href: "/dashboard/parametres", icon: "store", label: "Général", mots: "boutique nom adresse devise whatsapp coordonnées" },
  { href: "/dashboard/abonnement", icon: "receipt", label: "Forfait", moduleKey: "finance", mots: "abonnement palier pro illimité facturation" },
  { href: "/dashboard/parametres/equipe", icon: "users", label: "Utilisateurs", mots: "équipe membres rôles permissions livreur caissier" },
  { href: "/dashboard/livraison", icon: "truck", label: "Expédition et livraison", mots: "zones tarifs livraison délais" },
  { href: "/dashboard/entrepots", icon: "pin", label: "Emplacements", moduleKey: "produits", mots: "entrepôts magasins stock" },
  { href: "/dashboard/connecteurs", icon: "grid", label: "Applications", moduleKey: "boutique", mots: "connecteurs intégrations" },
  { href: "/dashboard/parametres/domaine", icon: "globe", label: "Domaines", mots: "nom de domaine dns" },
  { href: "/dashboard/marketing/tracking", icon: "bolt", label: "Événements clients", moduleKey: "marketing", mots: "pixels meta tiktok google analytics suivi" },
  { href: "/dashboard/parametres/notifications", icon: "bell", label: "Notifications", mots: "e-mail sms whatsapp alertes" },
  { href: "/dashboard/profil", icon: "user", label: "Mon compte", mots: "profil mot de passe sécurité" },
];

/** Préfixes rendus avec la sidebar des Paramètres. */
export function estRouteParametres(pathname: string) {
  return SECTIONS_PARAMETRES.some((s) => pathname === s.href || pathname.startsWith(s.href + "/"));
}

const CLE_RETOUR = "axso:retour-parametres";
/** Mémorise la dernière page hors Paramètres, pour le lien « ‹ Paramètres ». */
export function memoriserRetour(pathname: string) {
  if (estRouteParametres(pathname)) return;
  try { sessionStorage.setItem(CLE_RETOUR, pathname); } catch { /* stockage indisponible */ }
}

export function SettingsSidebar({ boutiqueNom, boutiqueUrl, nom, email, permissions, initiales }: {
  boutiqueNom?: string; boutiqueUrl?: string; nom: string; email: string;
  permissions?: Record<ModuleKey, Niveau>; initiales: string;
}) {
  const t = useT();
  const pathname = usePathname();
  const [retour, setRetour] = useState("/dashboard/accueil");
  const [q, setQ] = useState("");
  useEffect(() => { try { setRetour(sessionStorage.getItem(CLE_RETOUR) || "/dashboard/accueil"); } catch { /* stockage indisponible */ } }, []);

  const terme = q.trim().toLowerCase();
  const sections = SECTIONS_PARAMETRES
    .filter((s) => autorise(s, permissions))
    .filter((s) => !terme || `${s.label} ${s.mots ?? ""}`.toLowerCase().includes(terme));
  const active = [...SECTIONS_PARAMETRES].sort((a, b) => b.href.length - a.href.length)
    .find((s) => pathname === s.href || pathname.startsWith(s.href + "/"));
  const initialesUser = (nom || email || "A").split(/\s+/).map((m) => m[0]).slice(0, 2).join("").toUpperCase();
  let domaine = "";
  try { domaine = boutiqueUrl ? new URL(boutiqueUrl).host : ""; } catch { /* adresse relative */ }

  return (
    <aside className="axd-nav axd-snav" aria-label={t("Paramètres")}>
      <Link href={retour} className="axd-snav__back"><Icon name="chevronLeft" />{t("Paramètres")}</Link>
      <label className="axd-nav-search" style={{ cursor: "text" }}>
        <Icon name="search" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Rechercher dans les paramètres")} aria-label={t("Rechercher dans les paramètres")} />
      </label>
      <nav className="axd-nav__scroll">
        <div className="axd-snav__store">
          <span className="axd-store-av">{initiales}</span>
          <div style={{ minWidth: 0 }}>
            <div className="axd-snav__store-name">{t(boutiqueNom) || t("Ma boutique")}</div>
            {domaine && <div className="axd-snav__store-domain">{domaine}</div>}
          </div>
        </div>
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="axd-snav__item" aria-current={active?.href === s.href ? "page" : undefined} prefetch={false}>
            <Icon name={s.icon} size={18} />{t(s.label)}
          </Link>
        ))}
        {sections.length === 0 && <p className="axd-snav__vide">{t("Aucun réglage ne correspond à « {0} »", q)}</p>}
      </nav>
      <div className="axd-snav__user">
        <span className="axd-snav__av">{initialesUser}</span>
        <div style={{ minWidth: 0 }}>
          <div className="axd-snav__store-name">{t(nom) || email}</div>
          {email && <div className="axd-snav__store-domain">{email}</div>}
        </div>
      </div>
    </aside>
  );
}
