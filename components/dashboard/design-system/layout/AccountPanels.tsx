"use client";
// Panneaux ouverts depuis la puce boutique (§5.2) et la barre mobile (§13.3) :
// notifications marchand et menu du compte. Reprend la logique de l'ancien
// en-tête (flux AlerteCommande, PATCH /api/notifications-marchand, signOut).

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ecouterNotifications } from "@/components/dashboard/AlerteCommande";
import { basculerBoutique, BoutiqueSwitcher } from "@/components/dashboard/BoutiqueSwitcher";
import { ouvrirReglagePush } from "@/components/ActivationPush";
import { LangueSelecteur } from "@/components/ui/LangueSelecteur";
import { useAbonnementOverlay } from "@/components/dashboard/AbonnementOverlayProvider";
import { lienSignalement } from "@/lib/signalements";
import { useT } from "@/components/I18nProvider";
import { Icon, type IconName } from "../icons/Icon";

export interface NotifMarchand {
  id: string; type: string; titre: string; message: string;
  lien?: string | null; lu: boolean; createdAt: string;
  tenantId: string; nomBoutique: string; autreBoutique: boolean;
}

/** Notifications du marchand, partagées par la sidebar et la barre mobile. */
export function useNotifications() {
  const [notifications, setNotifications] = useState<NotifMarchand[]>([]);
  const [nonLues, setNonLues] = useState(0);
  useEffect(() => ecouterNotifications((d) => { setNotifications(d.notifications as NotifMarchand[]); setNonLues(d.nonLues); }), []);
  const marquerToutLu = async () => {
    setNonLues(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
    try { await fetch("/api/notifications-marchand", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toutMarquer: true }) }); } catch {}
  };
  return { notifications, nonLues, marquerToutLu };
}

const ICONES: Record<string, IconName> = {
  nouvelle_commande: "orders", commande_whatsapp: "whatsapp", escalade_humain: "info",
  paiement: "money", avis: "star", stock_bas: "box",
};

function tempsEcoule(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "À l’instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h} h`;
  return `Il y a ${Math.floor(h / 24)} j`;
}

/** Ferme un panneau au clic extérieur ou sur Échap. */
export function useFermeture(ouvert: boolean, fermer: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!ouvert) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) fermer(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") fermer(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [ouvert, fermer, ref]);
}

export function NotificationsPanel({ onClose, data }: { onClose: () => void; data: ReturnType<typeof useNotifications> }) {
  const t = useT();
  const { notifications, nonLues, marquerToutLu } = data;
  return (
    <div className="axd-popover axd-notif-pop" role="dialog" aria-label={t("Notifications")}>
      <div className="axd-modal__head" style={{ position: "static" }}>
        <span style={{ flex: 1 }}>{t("Notifications")}</span>
        {nonLues > 0 && <button type="button" className="axd-btn axd-btn--plain axd-btn--sm" onClick={marquerToutLu}>{t("Tout marquer comme lu")}</button>}
      </div>
      {notifications.length === 0 && <p className="axd-cmdk__empty">{t("Aucune notification pour l’instant")}</p>}
      {notifications.map((n) => {
        const contenu = (
          <>
            <span style={{ color: "var(--color-text-secondary)", marginTop: 2 }}><Icon name={ICONES[n.type] ?? "bell"} /></span>
            <span style={{ minWidth: 0 }}>
              <span className="axd-notif__title" style={{ display: "block", fontWeight: n.lu ? 400 : 600 }}>{t(n.titre)}</span>
              <span style={{ display: "block", color: "var(--color-text-secondary)" }}>{t(n.message)}</span>
              <span className="axd-notif__meta">{tempsEcoule(n.createdAt)}{n.autreBoutique ? ` · ${n.nomBoutique}` : ""}</span>
            </span>
          </>
        );
        const cls = `axd-notif${n.lu ? "" : " axd-notif--unread"}`;
        // Notification d'une autre boutique : bascule dessus avant d'ouvrir le lien.
        if (n.autreBoutique) return <div key={n.id} className={cls} onClick={() => basculerBoutique(n.tenantId, n.lien)}>{contenu}</div>;
        if (n.lien) return <Link key={n.id} href={n.lien} className={cls} onClick={onClose}>{contenu}</Link>;
        return <div key={n.id} className={cls} style={{ cursor: "default" }}>{contenu}</div>;
      })}
      <div className="axd-modal__foot" style={{ justifyContent: "flex-start" }}>
        <button type="button" className="axd-btn axd-btn--plain axd-btn--sm" onClick={() => { onClose(); ouvrirReglagePush(); }}>{t("Notifications sur cet appareil")}</button>
      </div>
    </div>
  );
}

export function AccountPanel({ onClose, nom, email, boutiqueUrl }: { onClose: () => void; nom: string; email: string; boutiqueUrl?: string | null }) {
  const t = useT();
  const pathname = usePathname();
  const { openAbonnement } = useAbonnementOverlay();
  return (
    <div className="axd-popover" role="menu" aria-label={t("Compte")}>
      <div style={{ padding: "var(--space-200) var(--space-200) var(--space-150)" }}>
        <div style={{ fontWeight: 600, color: "var(--color-text-strong)" }}>{t(nom)}</div>
        {email && <div className="axd-notif__meta" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{email}</div>}
      </div>
      <div style={{ padding: "0 var(--space-200) var(--space-150)" }} className="empty:hidden"><BoutiqueSwitcher /></div>
      <div className="axd-menu-sep" />
      {boutiqueUrl && (
        <a href={boutiqueUrl} target="_blank" rel="noopener noreferrer" className="axd-menu-item" onClick={onClose}><Icon name="external" />{t("Voir la boutique")}</a>
      )}
      <Link href="/dashboard/profil" className="axd-menu-item" onClick={onClose}><Icon name="user" />{t("Mon profil")}</Link>
      <button type="button" className="axd-menu-item" onClick={() => { onClose(); openAbonnement(); }}><Icon name="receipt" />{t("Forfait")}</button>
      <Link href="/dashboard/parametres" className="axd-menu-item" onClick={onClose}><Icon name="gear" />{t("Paramètres")}</Link>
      <Link href={lienSignalement(pathname)} className="axd-menu-item" onClick={onClose}><Icon name="help" />{t("Signaler un problème")}</Link>
      <div style={{ padding: "var(--space-100) var(--space-200)" }}><LangueSelecteur ouvrirVers="haut" /></div>
      <div className="axd-menu-sep" />
      <button type="button" className="axd-menu-item axd-menu-item--critical" onClick={() => signOut({ callbackUrl: "/connexion" })}><Icon name="logout" />{t("Déconnexion")}</button>
    </div>
  );
}
