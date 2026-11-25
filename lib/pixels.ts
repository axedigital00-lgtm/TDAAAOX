// Pixels publicitaires d'une boutique. Meta, TikTok et Snapchat : plusieurs
// identifiants par plateforme (agence, partenaire, ancien compte publicitaire…),
// enregistrés séparés par des virgules dans le même champ. Google Tag Manager :
// un seul conteneur. Format de chaque ID vérifié par la page Suivi et par /api/tenants.
export const FORMAT_PIXEL = {
  metaPixelId: /^\d{10,20}$/,
  tiktokPixelId: /^[A-Z0-9]{10,30}$/i,
  snapPixelId: /^[0-9a-f-]{20,40}$/i,
  gtmId: /^GTM-[A-Z0-9]{4,12}$/i,
} as const;

export type ClePixel = keyof typeof FORMAT_PIXEL;
export const PIXELS_MULTIPLES: ClePixel[] = ["metaPixelId", "tiktokPixelId", "snapPixelId"];
export const MAX_PIXELS = 10;

/** Identifiants d'un champ (virgules, espaces ou retours à la ligne), sans doublon. */
export function listePixels(v?: string | null): string[] {
  return [...new Set(String(v ?? "").split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean))];
}

/** Valeur à enregistrer pour un champ de pixel, ou l'erreur à afficher. */
export function normaliserPixels(cle: ClePixel, v: unknown): { valeur: string | null } | { erreur: string } {
  if (v === null || v === undefined) return { valeur: null };
  if (typeof v !== "string" && !Array.isArray(v)) return { erreur: `Identifiant ${cle} invalide` };
  const ids = listePixels(Array.isArray(v) ? v.join(",") : v);
  if (!ids.length) return { valeur: null };
  const multiple = PIXELS_MULTIPLES.includes(cle);
  if (!multiple && ids.length > 1) return { erreur: "Un seul conteneur Google Tag Manager par boutique" };
  if (ids.length > MAX_PIXELS) return { erreur: `${MAX_PIXELS} pixels au maximum par plateforme` };
  const invalide = ids.find((id) => !FORMAT_PIXEL[cle].test(id));
  if (invalide) return { erreur: `Identifiant invalide : ${invalide.slice(0, 40)}` };
  return { valeur: ids.join(",") };
}
