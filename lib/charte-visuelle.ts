// Identité visuelle choisie à l'inscription (écran « charte ») : couleurs tirées du logo,
// lisibilité, contrôle du fichier logo envoyé avant la création du compte.
// Module pur : navigateur (extraction des couleurs), route d'envoi du logo, inscription, tests.
import { FONTS } from "./theme-fonts";

// ─── Couleurs ─────────────────────────────────────────────────────────────
const versHex = (r: number, g: number, b: number) => "#" + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const distance = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Saturation (0 à 1) d'une couleur #rrggbb. */
export function saturation(hex: string): number {
  const [r, g, b] = rgb(hex).map((x) => x / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  const l = (max + min) / 2;
  return (max - min) / (1 - Math.abs(2 * l - 1));
}

/** Luminance relative WCAG d'une couleur #rrggbb. */
export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((x) => { const c = x / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Texte lisible sur ce fond (WCAG AA, texte courant). */
export const lisible = (texte: string, fond: string) => contraste(texte, fond) >= 4.5;

/**
 * Palette d'un logo à partir des pixels RGBA d'un canvas : couleurs les plus présentes,
 * sans le transparent ni le blanc du fond, regroupées par teinte proche (6 au plus).
 */
export function paletteDepuisPixels(px: ArrayLike<number>, max = 6): string[] {
  const seaux = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i + 3 < px.length; i += 4) {
    const [r, g, b, a] = [px[i], px[i + 1], px[i + 2], px[i + 3]];
    if (a < 128 || (r > 235 && g > 235 && b > 235)) continue;
    const cle = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const s = seaux.get(cle) ?? { n: 0, r: 0, g: 0, b: 0 };
    s.n++; s.r += r; s.g += g; s.b += b;
    seaux.set(cle, s);
  }
  const palette: string[] = [];
  for (const s of [...seaux.values()].sort((x, y) => y.n - x.n)) {
    const c = [s.r / s.n, s.g / s.n, s.b / s.n];
    if (palette.some((p) => distance(rgb(p), c) < 48)) continue;
    palette.push(versHex(c[0], c[1], c[2]));
    if (palette.length >= max) break;
  }
  return palette;
}

/**
 * Principale = la couleur vive la plus présente (boutons, bandeaux) ; secondaire = la plus
 * foncée des autres (titres et textes). Logo d'une seule couleur : secondaire = `repli`.
 */
export function couleursDuLogo(palette: string[], repli: string): { principale: string; secondaire: string } | null {
  if (!palette.length) return null;
  const principale = palette.find((c) => saturation(c) > 0.25 && luminance(c) > 0.03) ?? palette[0];
  const autres = palette.filter((c) => c !== principale).sort((a, b) => luminance(a) - luminance(b));
  return { principale, secondaire: autres[0] ?? repli };
}

const POLICES = new Set<string>(FONTS.map((f) => f.v));
export const policeConnue = (v?: string | null) => !!v && POLICES.has(v);

// ─── Logo envoyé avant la création du compte ──────────────────────────────
export const LOGO_TAILLE_MAX = 5 * 1024 * 1024;
export const DOSSIER_LOGOS_TEMP = "inscription/logos/";
const FORMATS: Record<string, { ext: string; exts: string[] }> = {
  "image/png": { ext: "png", exts: ["png"] },
  "image/jpeg": { ext: "jpg", exts: ["jpg", "jpeg"] },
  "image/webp": { ext: "webp", exts: ["webp"] },
  "image/svg+xml": { ext: "svg", exts: ["svg"] },
};
export const TYPES_LOGO = Object.keys(FORMATS);

// Tout ce qui peut exécuter du code ou charger une ressource externe dans un SVG ouvert directement.
const SVG_DANGEREUX = /<script|<foreignobject|<iframe|<embed|<object|<!entity|<!doctype|\bon[a-z]+\s*=|javascript:|(?:xlink:)?href\s*=\s*["']?\s*(?!#|data:image\/)[a-z]/i;

const commence = (o: Uint8Array, sig: number[], decalage = 0) => sig.every((x, i) => o[decalage + i] === x);

/** Contrôle d'un logo envoyé : type déclaré, extension, signature du fichier, taille ; SVG sans script. */
export function validerLogo(f: { type: string; nom: string; taille: number; octets: Uint8Array }):
  { ok: true; ext: string; type: string } | { ok: false; erreur: string } {
  const format = FORMATS[f.type];
  const ext = f.nom.toLowerCase().split(".").pop() ?? "";
  if (!format || !format.exts.includes(ext)) return { ok: false, erreur: "Format non accepté : PNG, JPG, SVG ou WebP." };
  if (f.taille <= 0 || f.taille > LOGO_TAILLE_MAX || f.octets.length > LOGO_TAILLE_MAX) return { ok: false, erreur: "Le logo doit faire 5 Mo au maximum." };
  const o = f.octets;
  const signatureOk =
    format.ext === "png" ? commence(o, [0x89, 0x50, 0x4e, 0x47])
    : format.ext === "jpg" ? commence(o, [0xff, 0xd8, 0xff])
    : format.ext === "webp" ? commence(o, [0x52, 0x49, 0x46, 0x46]) && commence(o, [0x57, 0x45, 0x42, 0x50], 8)
    : true;
  if (!signatureOk) return { ok: false, erreur: "Ce fichier n'est pas une image valide." };
  if (format.ext === "svg") {
    const texte = new TextDecoder("utf-8", { fatal: false }).decode(o);
    if (!/<svg[\s>]/i.test(texte)) return { ok: false, erreur: "Ce fichier n'est pas une image valide." };
    if (SVG_DANGEREUX.test(texte)) return { ok: false, erreur: "Ce SVG contient du code ou des liens externes : exporte-le à nouveau, ou envoie un PNG." };
  }
  return { ok: true, ext: format.ext, type: f.type };
}

/** Seuls les logos envoyés par /api/inscription/logo (Vercel Blob, dossier temporaire) sont rattachés à une boutique. */
export function logoTemporaireValide(url?: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com")
      && new RegExp(`^/${DOSSIER_LOGOS_TEMP}[A-Za-z0-9_-]+\\.(png|jpg|webp|svg)$`).test(u.pathname);
  } catch { return false; }
}

// ─── Polices et thème ─────────────────────────────────────────────────────
export type PolicesCharte = { titre: string; corps: string };

/**
 * Les 3 associations titre/texte proposées à l'écran « charte » : celle du design choisi d'abord,
 * puis les suivantes (designs proposés, puis le reste), sans doublon ni police inconnue.
 */
export function associationsPolices(candidates: { titre?: string; corps?: string }[], max = 3): PolicesCharte[] {
  const vues = new Set<string>();
  const res: PolicesCharte[] = [];
  for (const p of candidates) {
    if (!policeConnue(p.titre) || !policeConnue(p.corps) || vues.has(`${p.titre}|${p.corps}`)) continue;
    vues.add(`${p.titre}|${p.corps}`);
    res.push({ titre: p.titre!, corps: p.corps! });
    if (res.length >= max) break;
  }
  return res;
}

/**
 * Surcharges de thème (Tenant.themeConfig) tirées de la charte : principale → accent,
 * secondaire → texte s'il reste lisible sur le fond du design, polices connues seulement.
 */
export function themeDepuisCharte(
  charte: { couleurs?: { principale: string; secondaire: string } | null; polices?: { titre: string; corps: string } | null },
  fond = "#ffffff",
): { colors?: { accent: string; texte?: string }; fonts?: PolicesCharte } {
  const { couleurs, polices } = charte;
  return {
    ...(couleurs && { colors: { accent: couleurs.principale, ...(lisible(couleurs.secondaire, fond) && { texte: couleurs.secondaire }) } }),
    ...(polices && policeConnue(polices.titre) && policeConnue(polices.corps) && { fonts: { titre: polices.titre, corps: polices.corps } }),
  };
}
