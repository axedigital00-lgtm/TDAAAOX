// Attribution des commandes (refonte admin D28, MASTERPROMPT §8.11) : d'où vient l'acheteur.
// À l'arrivée sur la vitrine (proxy.ts), les paramètres utm_* et le site référent sont gardés
// dans un cookie de 30 jours propre à la boutique ; une visite directe (ou depuis la boutique
// elle-même) ne l'écrase pas : on retient le dernier clic non direct. La commande le recopie.

export type Attribution = { source: string | null; medium: string | null; campagne: string | null; referent: string | null };

export const DUREE_ATTRIBUTION = 30 * 86_400;
export const cookieAttribution = (slug: string) => `axso_attr_${slug.replace(/[^a-z0-9-]/gi, "")}`;
export const OPTIONS_COOKIE_ATTRIBUTION = { maxAge: DUREE_ATTRIBUTION, path: "/", sameSite: "lax" as const, httpOnly: true };

const court = (v: string | null | undefined) => {
  const s = (v ?? "").trim().slice(0, 100);
  return s || null;
};

/** Hôte d'une URL référente, sans « www. » ; null si illisible. */
function hote(url: string | null): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase() || null; } catch { return null; }
}

/**
 * Attribution d'une arrivée sur la vitrine, ou null si elle est directe / interne
 * (le cookie existant est alors conservé).
 */
export function lireAttribution(url: URL, referer: string | null, hoteVitrine: string): Attribution | null {
  const q = url.searchParams;
  const source = court(q.get("utm_source"));
  const medium = court(q.get("utm_medium"));
  const campagne = court(q.get("utm_campaign"));
  // Clic publicitaire sans utm : identifiants des régies.
  const regie = q.get("fbclid") ? "facebook" : q.get("gclid") ? "google" : q.get("ttclid") ? "tiktok" : null;
  const ref = hote(referer);
  const interne = !ref || ref === hoteVitrine.replace(/^www\./, "").split(":")[0].toLowerCase();
  if (!source && !regie && interne) return null;
  return {
    source: source ?? regie,
    medium: medium ?? (regie ? "cpc" : null),
    campagne,
    referent: interne ? null : ref,
  };
}

export function encoderAttribution(a: Attribution): string {
  return encodeURIComponent(JSON.stringify([a.source, a.medium, a.campagne, a.referent]));
}

export function decoderAttribution(v: string | undefined | null): Attribution | null {
  if (!v) return null;
  try {
    const t = JSON.parse(decodeURIComponent(v));
    if (!Array.isArray(t)) return null;
    const [source, medium, campagne, referent] = t.map((x: unknown) => (typeof x === "string" ? court(x) : null));
    return source || referent ? { source, medium, campagne, referent } : null;
  } catch { return null; }
}

const RESEAUX: [RegExp, string][] = [
  [/facebook|fb\.|^fb$|messenger/, "Facebook"],
  [/instagram|^ig$/, "Instagram"],
  [/tiktok/, "TikTok"],
  [/whatsapp|wa\.me|^wa$/, "WhatsApp"],
  [/google|gclid/, "Google"],
  [/youtube|youtu\.be/, "YouTube"],
  [/snapchat/, "Snapchat"],
  [/twitter|^x$|^t\.co$|(^|\.)x\.com$/, "X"],
  [/bing|yahoo|duckduckgo|ecosia/, "Moteurs de recherche"],
];

/** Canal lisible d'une commande (« Direct » si rien n'est connu). */
export function canalAttribution(a: { utmSource?: string | null; utmMedium?: string | null; referent?: string | null }): string {
  const s = (a.utmSource ?? "").toLowerCase();
  const m = (a.utmMedium ?? "").toLowerCase();
  const r = (a.referent ?? "").toLowerCase();
  if (/e-?mail|newsletter/.test(m) || /e-?mail|newsletter/.test(s)) return "E-mail";
  if (m === "sms" || s === "sms") return "SMS";
  for (const [motif, nom] of RESEAUX) if ((s && motif.test(s)) || (r && motif.test(r))) return nom;
  if (s) return a.utmSource!.trim();
  if (r) return "Autres sites";
  return "Direct";
}
