"use client";
// Pied de la barre latérale (§5.2) : puce boutique (menu du compte) + cloche des notifications.
// Reprend tout ce que portait l'ancien en-tête (components/dashboard/Header.tsx) : notifications
// (lues via AlerteCommande, bascule de boutique, réglage push), voir la boutique, changer de
// boutique, langue, profil, signaler un problème, déconnexion.
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Icon, type IconName } from "@/components/ui/icones";
import { Popover } from "@/components/ui/adm";
import { useT } from "@/components/I18nProvider";
import { ecouterNotifications } from "@/components/dashboard/AlerteCommande";
import { ouvrirReglagePush } from "@/components/ActivationPush";
import { BoutiqueSwitcher, basculerBoutique } from "@/components/dashboard/BoutiqueSwitcher";
import { LangueSelecteur } from "@/components/ui/LangueSelecteur";
import { lienSignalement } from "@/lib/signalements";
import { cn } from "@/lib/utils";

interface NotifMarchand {
  id: string; type: string; titre: string; message: string;
  lien?: string | null; lu: boolean; createdAt: string;
  tenantId: string; nomBoutique: string; autreBoutique: boolean;
}

const ICONES: Record<string, IconName> = {
  nouvelle_commande: "orders", commande_whatsapp: "whatsapp", escalade_humain: "flag",
  paiement: "money", avis: "star", stock_bas: "box",
};

function tempsEcoule(iso: string, t: ReturnType<typeof useT>) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return t("À l'instant");
  if (min < 60) return t("Il y a {0} min", min);
  const h = Math.floor(min / 60);
  return h < 24 ? t("Il y a {0} h", h) : t("Il y a {0} j", Math.floor(h / 24));
}

/** Notifications du marchand : une seule interrogation pour tout le dashboard (AlerteCommande). */
export function useNotifications() {
  const [notifications, setNotifications] = useState<NotifMarchand[]>([]);
  const [nonLues, setNonLues] = useState(0);
  useEffect(() => ecouterNotifications((d) => { setNotifications(d.notifications); setNonLues(d.nonLues); }), []);
  const toutLu = async () => {
    setNonLues(0);
    setNotifications((p) => p.map((n) => ({ ...n, lu: true })));
    try { await fetch("/api/notifications-marchand", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toutMarquer: true }) }); } catch { /* réseau : réessayé au prochain clic */ }
  };
  return { notifications, nonLues, toutLu };
}

const POPOVER_HAUT = "top-auto bottom-full mb-1 mt-0 text-(--color-text)";

export function Cloche({ sombre = true, versLeHaut = false }: { sombre?: boolean; versLeHaut?: boolean }) {
  const t = useT();
  const [ouvert, setOuvert] = useState(false);
  const { notifications, nonLues, toutLu } = useNotifications();
  return (
    <Popover open={ouvert} onClose={() => setOuvert(false)} align="end" className={cn("w-[320px] max-w-[calc(100vw-24px)] p-0", versLeHaut && POPOVER_HAUT)}
      activator={
        <button type="button" onClick={() => setOuvert((v) => !v)} aria-haspopup="dialog" aria-expanded={ouvert}
          aria-label={nonLues > 0 ? t("Notifications ({0} non lues)", nonLues) : t("Notifications")}
          className={cn("relative flex size-7 items-center justify-center rounded-(--radius-md)", sombre ? "text-(--color-nav-icon) hover:bg-(--color-nav-hover) hover:text-white" : "text-(--color-icon-header) hover:bg-(--color-surface-tertiary)")}>
          <Icon name="bell" size={16} />
          {nonLues > 0 && <span className="absolute -top-0.5 -right-0.5 rounded-[7px] bg-(--color-notification) px-1 text-[10px] leading-[14px] font-semibold text-white">{nonLues > 9 ? "9+" : nonLues}</span>}
        </button>
      }>
      <div className="flex items-center justify-between border-b border-(--color-border-secondary) px-3 py-2.5">
        <span className="text-[13px] font-[650] text-(--color-text-strong)">{t("Notifications")}</span>
        {nonLues > 0 && <button type="button" onClick={toutLu} className="text-[12px] text-(--color-link) hover:underline">{t("Tout marquer comme lu")}</button>}
      </div>
      <div className="max-h-[360px] overflow-y-auto">
        {notifications.length === 0 && <p className="px-3 py-6 text-center text-[12px] text-(--color-text-secondary)">{t("Aucune notification pour l'instant")}</p>}
        {notifications.map((n) => {
          const contenu = (
            <span className={cn("flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-(--color-surface-secondary)", !n.lu && "bg-(--color-surface-secondary)")}>
              <Icon name={ICONES[n.type] ?? "info"} size={16} className="mt-0.5 text-(--color-icon-header)" />
              <span className="min-w-0">
                <span className={cn("block text-[13px] text-(--color-text-strong)", !n.lu && "font-semibold")}>{t(n.titre)}</span>
                <span className="block text-[12px] text-(--color-text-secondary)">{t(n.message)}</span>
                <span className="block text-[11px] text-(--color-text-subdued)">{tempsEcoule(n.createdAt, t)}{n.autreBoutique ? ` · ${n.nomBoutique}` : ""}</span>
              </span>
            </span>
          );
          // Notification d'une autre boutique : on bascule dessus avant d'ouvrir le lien.
          if (n.autreBoutique) return <button key={n.id} type="button" className="block w-full" onClick={() => basculerBoutique(n.tenantId, n.lien)}>{contenu}</button>;
          return n.lien ? <Link key={n.id} href={n.lien} className="block" onClick={() => setOuvert(false)}>{contenu}</Link> : <div key={n.id}>{contenu}</div>;
        })}
      </div>
      <div className="border-t border-(--color-border-secondary) px-3 py-2">
        <button type="button" onClick={() => { setOuvert(false); ouvrirReglagePush(); }} className="text-[12px] text-(--color-text-secondary) hover:underline">{t("Notifications sur cet appareil")}</button>
      </div>
    </Popover>
  );
}

/** Initiales de la boutique (avatar jaune, §5.2). */
export function AvatarBoutique({ nom, taille = 20 }: { nom?: string; taille?: number }) {
  const ini = (nom || "A").split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join("");
  return (
    <span aria-hidden style={{ width: taille, height: taille }}
      className="flex flex-none items-center justify-center rounded-(--radius-sm) bg-(--color-brand) text-[11px] font-bold text-(--color-brand-ink)">{ini}</span>
  );
}

/** Puce boutique : ouvre le menu du compte (vers le haut, elle est en pied de barre). */
export function PuceBoutique({ boutiqueNom, boutiqueUrl, nomCompte, email, compact }: { boutiqueNom?: string; boutiqueUrl?: string; nomCompte: string; email?: string; compact?: boolean }) {
  const t = useT();
  const pathname = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const ligne = "flex h-8 w-full items-center gap-2 rounded-(--radius-md) px-2 text-left text-[13px] text-(--color-text) hover:bg-(--color-surface-tertiary)";
  return (
    <Popover open={ouvert} onClose={() => setOuvert(false)} className={cn("w-[248px]", POPOVER_HAUT)}
      activator={
        <button type="button" onClick={() => setOuvert((v) => !v)} aria-haspopup="menu" aria-expanded={ouvert}
          aria-label={compact ? boutiqueNom || t("Mon compte") : undefined}
          className="flex h-[30px] min-w-0 items-center gap-2 rounded-(--radius-md) px-1.5 text-[13px] font-[550] text-(--color-nav-text) hover:bg-(--color-nav-hover)">
          <AvatarBoutique nom={boutiqueNom} />
          {!compact && <span className="truncate">{boutiqueNom || t("Mon compte")}</span>}
        </button>
      }>
      <div className="border-b border-(--color-border-secondary) px-2 pt-1 pb-2">
        <p className="truncate text-[13px] font-[650] text-(--color-text-strong)">{nomCompte || t("Mon compte")}</p>
        {email && <p className="truncate text-[12px] text-(--color-text-secondary)">{email}</p>}
      </div>
      <div className="py-1 empty:hidden"><BoutiqueSwitcher /></div>
      <div className="py-1">
        {boutiqueUrl && <a href={boutiqueUrl} target="_blank" rel="noopener noreferrer" className={ligne}><Icon name="external" />{t("Voir la boutique")}</a>}
        <Link href="/dashboard/profil" className={ligne} onClick={() => setOuvert(false)}><Icon name="user" />{t("Mon profil")}</Link>
        <Link href={lienSignalement(pathname)} className={ligne} onClick={() => setOuvert(false)}><Icon name="flag" />{t("Signaler un problème")}</Link>
        <div className="px-1 py-1"><LangueSelecteur ouvrirVers="haut" /></div>
      </div>
      <div className="border-t border-(--color-border-secondary) pt-1">
        <button type="button" onClick={() => signOut({ callbackUrl: "/connexion" })} className={cn(ligne, "text-(--color-critical-text)")}>
          <Icon name="arrowRight" />{t("Déconnexion")}
        </button>
      </div>
    </Popover>
  );
}
