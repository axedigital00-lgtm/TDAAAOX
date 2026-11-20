// Logos officiels des plateformes externes (WhatsApp, Meta, Google Ads…).
// Un seul registre pour tout l'admin et le site : chaque fois qu'une
// plateforme est citée avec une icône, on affiche son vrai logo.
// Fichiers et sources : public/brand/plateformes, public/brand/README.md.
import type { CSSProperties } from "react";

export const PLATEFORMES = {
  whatsapp: { nom: "WhatsApp", src: "/brand/plateformes/whatsapp.svg" },
  facebook: { nom: "Facebook", src: "/brand/plateformes/facebook.svg" },
  instagram: { nom: "Instagram", src: "/brand/plateformes/instagram.svg" },
  messenger: { nom: "Messenger", src: "/brand/plateformes/messenger.svg" },
  meta: { nom: "Meta", src: "/brand/plateformes/meta.svg" },
  tiktok: { nom: "TikTok", src: "/brand/plateformes/tiktok.svg" },
  snapchat: { nom: "Snapchat", src: "/brand/plateformes/snapchat.svg" },
  pinterest: { nom: "Pinterest", src: "/brand/plateformes/pinterest.svg" },
  youtube: { nom: "YouTube", src: "/brand/plateformes/youtube.svg" },
  x: { nom: "X", src: "/brand/plateformes/x.svg" },
  linkedin: { nom: "LinkedIn", src: "/brand/plateformes/linkedin.svg" },
  telegram: { nom: "Telegram", src: "/brand/plateformes/telegram.svg" },
  google: { nom: "Google", src: "/brand/plateformes/google.svg" },
  "google-ads": { nom: "Google Ads", src: "/brand/plateformes/google-ads.svg" },
  "google-analytics": { nom: "Google Analytics", src: "/brand/plateformes/google-analytics.svg" },
  "google-tag-manager": { nom: "Google Tag Manager", src: "/brand/plateformes/google-tag-manager.svg" },
  gmail: { nom: "Gmail", src: "/brand/plateformes/gmail.svg" },
  resend: { nom: "Resend", src: "/brand/plateformes/resend.svg" },
  aliexpress: { nom: "AliExpress", src: "/brand/plateformes/aliexpress.svg" },
  alibaba: { nom: "Alibaba", src: "/brand/plateformes/alibaba.svg" },
  shopify: { nom: "Shopify", src: "/brand/plateformes/shopify.svg" },
  dhl: { nom: "DHL", src: "/brand/plateformes/dhl.svg" },
  cloudinary: { nom: "Cloudinary", src: "/brand/plateformes/cloudinary.svg" },
  "orange-money": { nom: "Orange Money", src: "/brand/partenaires/orange-money.png", sombre: true },
  "mtn-momo": { nom: "MTN MoMo", src: "/brand/partenaires/mtn-momo.png", sombre: true },
} as const satisfies Record<string, { nom: string; src: string; sombre?: boolean }>;

export type Plateforme = keyof typeof PLATEFORMES;

/** Retrouve la plateforme à partir d'un identifiant libre (« google_ads », « Meta Ads », « tiktok »…). */
export function plateformeDepuis(id: string | null | undefined): Plateforme | null {
  if (!id) return null;
  const k = id.toLowerCase().replace(/[\s_]+/g, "-");
  if (k in PLATEFORMES) return k as Plateforme;
  if (k.startsWith("google-ads") || k === "googleads") return "google-ads";
  if (k.startsWith("google-analytics") || k === "ga4") return "google-analytics";
  if (k.startsWith("google")) return "google";
  if (k.startsWith("meta") || k.includes("pixel-meta")) return "meta";
  if (k.startsWith("facebook")) return "facebook";
  if (k.startsWith("instagram")) return "instagram";
  if (k.startsWith("tiktok")) return "tiktok";
  if (k.startsWith("whatsapp")) return "whatsapp";
  if (k.startsWith("snap")) return "snapchat";
  if (k === "twitter") return "x";
  return null;
}

/** Logo officiel d'une plateforme. `titre` : affiche le nom à côté. */
export function LogoPlateforme({ p, taille = 20, titre, style, className }: { p: Plateforme; taille?: number; titre?: boolean; style?: CSSProperties; className?: string }) {
  const def = PLATEFORMES[p];
  const sombre = "sombre" in def && def.sombre;
  const img = (
    <img
      src={def.src}
      alt={titre ? "" : def.nom}
      width={sombre ? undefined : taille}
      height={taille}
      loading="lazy"
      style={{ height: taille, width: sombre ? "auto" : taille, objectFit: "contain", display: "block", flex: "none", ...(sombre ? { background: "#0b0b0b", borderRadius: taille / 4, padding: taille / 8 } : {}), ...(titre ? {} : style) }}
      className={titre ? undefined : className}
    />
  );
  if (!titre) return img;
  return <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: 8, ...style }}>{img}<span>{def.nom}</span></span>;
}

/**
 * Remplaçant direct d'une icône lucide (`Icon: iconePlateforme("meta")`) dans
 * les listes existantes : même signature `size`, la couleur passée est ignorée
 * puisque le logo garde ses couleurs officielles.
 */
export function iconePlateforme(p: Plateforme) {
  const Icone = ({ size = 20, className }: { size?: number; style?: CSSProperties; className?: string; strokeWidth?: number }) => <LogoPlateforme p={p} taille={size} className={className} />;
  Icone.displayName = `Logo(${p})`;
  return Icone;
}
