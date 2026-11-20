"use client";
// Modales ouvertes depuis les libellés de groupe de la sidebar (§5.2, §8.24) :
// « Canaux de vente › » et « Applications › ».

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ModuleKey, Niveau } from "@/lib/permissions";
import { useT } from "@/components/I18nProvider";
import { Icon, type IconName } from "../icons/Icon";
import { LogoPlateforme, type Plateforme } from "@/components/brand/LogoPlateforme";
import { Modal } from "../components/Modal";
import { MORE_APPS, autorise, type NavSection } from "./navigation";

// `logos` : plateformes externes, affichées avec leur logo officiel.
const CANAUX: { icon: IconName; logos?: Plateforme[]; label: string; description: string; href: string; installe: boolean }[] = [
  { icon: "store", label: "Boutique en ligne", description: "Votre site de vente, thèmes et constructeur.", href: "/dashboard/boutique", installe: true },
  { icon: "whatsapp", logos: ["whatsapp"], label: "WhatsApp Business", description: "Catalogue, commandes et messages WhatsApp.", href: "/dashboard/whatsapp", installe: true },
  { icon: "sparkle", label: "Agentique", description: "Vos produits dans les assistants IA.", href: "/dashboard/controle-ia", installe: true },
  { icon: "monitor", label: "Point de vente", description: "Encaissez en boutique physique.", href: "/dashboard/pos/caisse", installe: true },
  { icon: "meta", logos: ["facebook", "instagram", "tiktok"], label: "Facebook, Instagram et TikTok", description: "Flux produits pour vos catalogues publicitaires.", href: "/dashboard/feeds", installe: false },
  { icon: "link", label: "Autres connecteurs", description: "Marketplaces et outils externes.", href: "/dashboard/connecteurs", installe: false },
];

export function ChannelsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={t("Ajouter un canal de vente")}>
      <div style={{ padding: "0 var(--space-400)" }}>
        {CANAUX.map((c) => (
          <div key={c.href} className="axd-row" style={{ paddingInline: 0 }}>
            {c.logos
              ? <span style={{ display: "inline-flex", gap: 2, flex: "none", width: c.logos.length > 1 ? undefined : 20 }}>{c.logos.map((l) => <LogoPlateforme key={l} p={l} taille={c.logos!.length > 1 ? 16 : 20} />)}</span>
              : <Icon name={c.icon} size={20} />}
            <div className="axd-row__body"><div className="axd-row__title">{t(c.label)}</div><div className="axd-row__sub">{t(c.description)}</div></div>
            <Link href={c.href} onClick={onClose} className={`axd-btn axd-btn--sm${c.installe ? "" : " axd-btn--primary"}`}>
              {c.installe ? t("Ouvrir") : t("Configurer")}
            </Link>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function AppsModal({ open, onClose, permissions, installed }: { open: boolean; onClose: () => void; permissions?: Record<ModuleKey, Niveau>; installed: NavSection[] }) {
  const t = useT();
  const [q, setQ] = useState("");
  const terme = q.trim().toLowerCase();
  const autres = useMemo(() => MORE_APPS.filter((a) => (!a.moduleKey || autorise(a, permissions))), [permissions]);
  const filtre = <T extends { label: string }>(l: T[]) => l.filter((a) => !terme || a.label.toLowerCase().includes(terme));

  return (
    <Modal open={open} onClose={() => { setQ(""); onClose(); }} className="axd-cmdk">
      <div className="axd-cmdk__search">
        <Icon name="search" />
        <span className="axd-badge">{t("Applis")}</span>
        <input data-autofocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Rechercher")} aria-label={t("Rechercher une application")} />
      </div>
      <div className="axd-cmdk__res">
        <div className="axd-cmdk__grp">{t("Applis installées ({0})", installed.length)}</div>
        {filtre(installed).map((a) => (
          <Link key={a.id} href={a.href} onClick={onClose} className="axd-cmdk__item">
            <span className="axd-cmdk__thumb" style={{ width: 26, height: 26 }}><Icon name={a.icon} /></span>{t(a.label)}
          </Link>
        ))}
        <div className="axd-cmdk__grp">{t("Applications AXSO")}</div>
        {filtre(autres).map((a) => (
          <Link key={a.href} href={a.href} onClick={onClose} className="axd-cmdk__item" style={{ alignItems: "flex-start" }}>
            <span className="axd-cmdk__thumb" style={{ width: 36, height: 36, borderRadius: 8 }}><Icon name={a.icon} /></span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontWeight: 600 }}>{t(a.label)}</span>
              <span className="axd-row__sub">{t("Conçue pour AXSO")} · {t(a.description)}</span>
            </span>
          </Link>
        ))}
      </div>
      <div className="axd-modal__foot" style={{ justifyContent: "flex-start" }}>
        <Link href="/dashboard/connecteurs" onClick={onClose} className="axd-btn axd-btn--plain axd-btn--sm"><Icon name="gear" />{t("Paramètres des applis")}</Link>
      </div>
    </Modal>
  );
}
